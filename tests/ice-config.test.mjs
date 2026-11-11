import assert from "node:assert/strict";
import test from "node:test";
import {
  STUN_ONLY_ICE_SERVERS,
  createIceConfigManager,
  parseIceServersPayload,
} from "../lib/ice-cache.mjs";

const TURN_DISABLED_MSG =
  "TURN relay disabled by server — connected with STUN-only ICE. Enable TURN_ENABLED=true on the backend if relay traversal is required.";
const ENDPOINT_UNAVAILABLE_MSG =
  "Relay server unavailable — using STUN-only fallback. Direct peer audio remains active, but restrictive networks may not connect; select Retry ICE Lookup to re-check relay servers.";

function makeTurnPayload(overrides = {}) {
  return {
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302"] },
      {
        urls: ["turn:turn.example.com:3478?transport=udp"],
        username: "1700003600:user-1",
        credential: "ephemeral-hmac-token",
      },
    ],
    turnEnabled: true,
    ttlSeconds: 3600,
    ...overrides,
  };
}

test("parseIceServersPayload validates valid TURN and STUN-only payloads and rejects malformed ones", () => {
  const valid = parseIceServersPayload(makeTurnPayload({ expiresAt: "2026-11-11T01:00:00Z" }));
  assert.equal(valid.turnEnabled, true);
  assert.equal(valid.iceServers.length, 2);

  const stunOnly = parseIceServersPayload({
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    turnEnabled: false,
    ttlSeconds: 0,
  });
  assert.equal(stunOnly.turnEnabled, false);

  assert.throws(() => parseIceServersPayload(null));
  assert.throws(() => parseIceServersPayload({ iceServers: [], turnEnabled: true, ttlSeconds: 300 }));
  assert.throws(() =>
    parseIceServersPayload({ iceServers: [{ urls: [] }], turnEnabled: true, ttlSeconds: 300 })
  );
  assert.throws(() =>
    parseIceServersPayload({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      turnEnabled: true,
      ttlSeconds: -1,
    })
  );
});

test("cold fetch caches TURN RTCConfiguration in memory without touching localStorage or sessionStorage", async () => {
  const prevLocal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const prevSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");

  const throwingStorage = {
    getItem() {
      throw new Error("localStorage must not be read");
    },
    setItem() {
      throw new Error("localStorage must not be written");
    },
    removeItem() {
      throw new Error("localStorage must not be modified");
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: throwingStorage,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: throwingStorage,
  });

  try {
    let fetchCount = 0;
    let nowMs = 1_000_000;
    const manager = createIceConfigManager({
      now: () => nowMs,
      fetcher: async () => {
        fetchCount += 1;
        return makeTurnPayload();
      },
    });

    const first = await manager.getIceConfiguration();
    assert.equal(fetchCount, 1);
    assert.equal(first.diagnostic, null);
    assert.equal(first.turnEnabled, true);
    assert.equal(first.fromCache, false);
    assert.equal(first.config.iceCandidatePoolSize, 4);
    assert.equal(first.config.iceServers[1].username, "1700003600:user-1");

    // Repeated call within valid cache window returns cached config idempotently
    nowMs += 30_000;
    const second = await manager.getIceConfiguration();
    assert.equal(fetchCount, 1);
    assert.equal(second.fromCache, true);
    assert.deepEqual(second.config, first.config);
  } finally {
    if (prevLocal) Object.defineProperty(globalThis, "localStorage", prevLocal);
    else delete globalThis.localStorage;

    if (prevSession) Object.defineProperty(globalThis, "sessionStorage", prevSession);
    else delete globalThis.sessionStorage;
  }
});

test("pre-expiry refresh triggers inside min(60s, 25% TTL) window and forceRefresh bypasses cache", async () => {
  let fetchCount = 0;
  let nowMs = 10_000_000;

  const manager = createIceConfigManager({
    now: () => nowMs,
    fetcher: async () => {
      fetchCount += 1;
      return makeTurnPayload({
        ttlSeconds: 120,
        iceServers: [
          { urls: ["stun:stun.l.google.com:19302"] },
          {
            urls: ["turn:turn.example.com:3478"],
            username: `user-${fetchCount}`,
            credential: `cred-${fetchCount}`,
          },
        ],
      });
    },
  });

  // TTL=120s -> refreshLeadMs = min(60_000, 30_000) = 30_000ms (triggers at +90_000ms)
  const res1 = await manager.getIceConfiguration();
  assert.equal(fetchCount, 1);
  assert.equal(res1.config.iceServers[1].username, "user-1");

  nowMs += 89_999;
  const res2 = await manager.getIceConfiguration();
  assert.equal(fetchCount, 1);
  assert.equal(res2.fromCache, true);

  nowMs += 1; // exactly 30_000ms before expiry
  const res3 = await manager.getIceConfiguration();
  assert.equal(fetchCount, 2);
  assert.equal(res3.fromCache, false);
  assert.equal(res3.config.iceServers[1].username, "user-2");

  // forceRefresh bypasses valid cache
  const res4 = await manager.getIceConfiguration({ forceRefresh: true });
  assert.equal(fetchCount, 3);
  assert.equal(res4.fromCache, false);
  assert.equal(res4.config.iceServers[1].username, "user-3");
});

test("deduplicates concurrent getIceConfiguration calls to a single fetch", async () => {
  let fetchCount = 0;
  let resolveFetch;
  const manager = createIceConfigManager({
    fetcher: () => {
      fetchCount += 1;
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    },
  });

  const p1 = manager.getIceConfiguration();
  const p2 = manager.getIceConfiguration();
  const p3 = manager.getIceConfiguration();
  assert.equal(fetchCount, 1);

  resolveFetch(makeTurnPayload());
  const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
  assert.equal(fetchCount, 1);
  assert.deepEqual(r1.config, r2.config);
  assert.deepEqual(r2.config, r3.config);
});

test("clearCache cancels stale in-flight write and forces next call to re-fetch cleanly", async () => {
  let fetchCount = 0;
  let resolveFirst;
  const manager = createIceConfigManager({
    fetcher: () => {
      fetchCount += 1;
      if (fetchCount === 1) {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(
        makeTurnPayload({
          iceServers: [
            { urls: ["stun:stun.l.google.com:19302"] },
            { urls: ["turn:turn.example.com:3478"], username: "fresh-user", credential: "fresh-cred" },
          ],
        })
      );
    },
  });

  const pending = manager.getIceConfiguration();
  manager.clearCache();
  resolveFirst(makeTurnPayload());
  const staleResult = await pending;
  assert.equal(staleResult.turnEnabled, true);

  // Cache was cleared while first fetch was in-flight, so next call must re-fetch
  const nextResult = await manager.getIceConfiguration();
  assert.equal(fetchCount, 2);
  assert.equal(nextResult.config.iceServers[1].username, "fresh-user");
});

test("returns STUN_ONLY_ICE_SERVERS with turn-disabled diagnostic when turnEnabled is false", async () => {
  let fetchCount = 0;
  const manager = createIceConfigManager({
    fetcher: async () => {
      fetchCount += 1;
      return {
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
        turnEnabled: false,
        ttlSeconds: 0,
      };
    },
  });

  const result = await manager.getIceConfiguration();
  assert.equal(fetchCount, 1);
  assert.equal(result.turnEnabled, false);
  assert.deepEqual(result.config, STUN_ONLY_ICE_SERVERS);
  assert.deepEqual(result.diagnostic, {
    mode: "turn-disabled",
    message: TURN_DISABLED_MSG,
  });
});

test("falls back to STUN_ONLY_ICE_SERVERS with endpoint-unavailable diagnostic on network or Zod errors", async () => {
  const networkFailManager = createIceConfigManager({
    fetcher: async () => {
      throw new Error("ECONNREFUSED secret-should-not-leak");
    },
  });

  const netRes = await networkFailManager.getIceConfiguration();
  assert.equal(netRes.turnEnabled, false);
  assert.deepEqual(netRes.config, STUN_ONLY_ICE_SERVERS);
  assert.deepEqual(netRes.diagnostic, {
    mode: "endpoint-unavailable",
    message: ENDPOINT_UNAVAILABLE_MSG,
  });
  assert.equal(netRes.diagnostic.message.includes("ECONNREFUSED"), false);

  const invalidPayloadManager = createIceConfigManager({
    fetcher: async () => ({ invalid: true }),
  });

  const zodRes = await invalidPayloadManager.getIceConfiguration();
  assert.equal(zodRes.turnEnabled, false);
  assert.deepEqual(zodRes.config, STUN_ONLY_ICE_SERVERS);
  assert.deepEqual(zodRes.diagnostic, {
    mode: "endpoint-unavailable",
    message: ENDPOINT_UNAVAILABLE_MSG,
  });
});
