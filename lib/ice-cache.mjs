import { z } from "zod";

export const STUN_ONLY_ICE_SERVERS = Object.freeze({
  iceServers: Object.freeze([
    Object.freeze({ urls: "stun:stun.l.google.com:19302" }),
    Object.freeze({ urls: "stun:stun.cloudflare.com:3478" }),
  ]),
  iceCandidatePoolSize: 4,
});

const TURN_DISABLED_DIAGNOSTIC = Object.freeze({
  mode: "turn-disabled",
  message:
    "TURN relay disabled by server — connected with STUN-only ICE. Enable TURN_ENABLED=true on the backend if relay traversal is required.",
});

const ENDPOINT_UNAVAILABLE_DIAGNOSTIC = Object.freeze({
  mode: "endpoint-unavailable",
  message:
    "Relay server unavailable — using STUN-only fallback. Direct peer audio remains active, but restrictive networks may not connect; select Retry ICE Lookup to re-check relay servers.",
});

const iceServerSchema = z.object({
  urls: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

const iceServersPayloadSchema = z
  .object({
    iceServers: z.array(iceServerSchema),
    turnEnabled: z.boolean(),
    ttlSeconds: z.number().int().min(0),
    expiresAt: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.turnEnabled && val.iceServers.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "iceServers must be non-empty when turnEnabled is true",
        path: ["iceServers"],
      });
    }
    if (val.expiresAt && Number.isNaN(Date.parse(val.expiresAt))) {
      ctx.addIssue({
        code: "custom",
        message: "expiresAt must be a valid ISO timestamp",
        path: ["expiresAt"],
      });
    }
  });

/**
 * Validate untrusted GET /api/v1/webrtc/ice-servers JSON payloads using Zod.
 * @param {unknown} payload
 */
export function parseIceServersPayload(payload) {
  return iceServersPayloadSchema.parse(payload);
}

function normalizeIceServers(servers) {
  return servers.map((server) => {
    const entry = {
      urls: Array.isArray(server.urls) ? [...server.urls] : server.urls,
    };
    if (server.username) {
      entry.username = server.username;
    }
    if (server.credential) {
      entry.credential = server.credential;
    }
    return entry;
  });
}

/**
 * Memory-only ICE configuration manager with concurrent deduplication,
 * pre-expiry refresh, and secret-free STUN-only fallback diagnostics.
 */
export function createIceConfigManager({ fetcher, now = () => Date.now() }) {
  if (typeof fetcher !== "function") {
    throw new TypeError("createIceConfigManager requires a fetcher function");
  }

  let cached = null;
  let inFlightPromise = null;
  let inFlightForce = false;
  let epoch = 0;

  async function getIceConfiguration(options = {}) {
    const forceRefresh = Boolean(options?.forceRefresh);
    const currentMs = now();

    if (!forceRefresh && cached && currentMs < cached.expiresAtMs - cached.refreshLeadMs) {
      return {
        config: cached.config,
        diagnostic: cached.diagnostic,
        turnEnabled: cached.turnEnabled,
        fromCache: true,
      };
    }

    if (inFlightPromise && (!forceRefresh || inFlightForce)) {
      return inFlightPromise;
    }

    const callEpoch = epoch;
    const runFetch = (async () => {
      try {
        const raw = await fetcher();
        const parsed = parseIceServersPayload(raw);
        const fetchedAtMs = now();

        if (!parsed.turnEnabled) {
          const ttlMs = parsed.ttlSeconds > 0 ? parsed.ttlSeconds * 1000 : 60_000;
          const entry = {
            config: STUN_ONLY_ICE_SERVERS,
            diagnostic: TURN_DISABLED_DIAGNOSTIC,
            turnEnabled: false,
            expiresAtMs: fetchedAtMs + ttlMs,
            refreshLeadMs: 0,
          };
          if (callEpoch === epoch) {
            cached = entry;
          }
          return {
            config: entry.config,
            diagnostic: entry.diagnostic,
            turnEnabled: false,
            fromCache: false,
          };
        }

        const parsedExpiresAtMs =
          parsed.expiresAt && !Number.isNaN(Date.parse(parsed.expiresAt))
            ? Date.parse(parsed.expiresAt)
            : fetchedAtMs + parsed.ttlSeconds * 1000;
        const ttlMs =
          parsed.ttlSeconds > 0
            ? parsed.ttlSeconds * 1000
            : Math.max(0, parsedExpiresAtMs - fetchedAtMs);
        const refreshLeadMs = Math.min(60_000, ttlMs * 0.25);
        const config = {
          iceServers: normalizeIceServers(parsed.iceServers),
          iceCandidatePoolSize: 4,
        };
        const entry = {
          config,
          diagnostic: null,
          turnEnabled: true,
          expiresAtMs: parsedExpiresAtMs,
          refreshLeadMs,
        };

        if (callEpoch === epoch) {
          cached = entry;
        }
        return {
          config,
          diagnostic: null,
          turnEnabled: true,
          fromCache: false,
        };
      } catch {
        return {
          config: STUN_ONLY_ICE_SERVERS,
          diagnostic: ENDPOINT_UNAVAILABLE_DIAGNOSTIC,
          turnEnabled: false,
          fromCache: false,
        };
      } finally {
        if (inFlightPromise === runFetch) {
          inFlightPromise = null;
          inFlightForce = false;
        }
      }
    })();

    inFlightPromise = runFetch;
    inFlightForce = forceRefresh;
    return runFetch;
  }

  function clearCache() {
    epoch += 1;
    cached = null;
    inFlightPromise = null;
    inFlightForce = false;
  }

  return {
    getIceConfiguration,
    clearCache,
  };
}
