export const SOCKET_SCHEMA_VERSION = 1;

export const CANONICAL_SERVER_EVENTS = new Set([
  "presence.snapshot",
  "presence.updated",
  "lobby.room_created",
  "lobby.room_updated",
  "lobby.room_deleted",
  "room.member_joined",
  "room.member_left",
  "room.snapshot",
  "room.settings_updated",
  "room.deleted",
  "room.host_changed",
  "voice.mute_changed",
  "voice.speaking_changed",
  "webrtc.offer",
  "webrtc.answer",
  "webrtc.ice_candidate",
  "screen_share.started",
  "screen_share.stopped",
  "chat.message_created",
  "chat.reaction_updated",
  "moderation.participant_kicked",
  "moderation.room_locked",
]);

export const CANONICAL_CLIENT_COMMANDS = new Set([
  "lobby.join",
  "lobby.leave",
  "presence.request",
  "room.join",
  "room.leave",
  "webrtc.offer",
  "webrtc.answer",
  "webrtc.ice_candidate",
  "voice.mute",
  "voice.speaking",
  "screen_share.start",
  "screen_share.stop",
  "chat.react",
  "moderation.mute_participant",
  "moderation.kick_participant",
  "moderation.lock_room",
  "mesh.ping",
]);

export const VERSIONED_ROOM_EVENTS = new Set([
  "lobby.room_created",
  "lobby.room_updated",
  "lobby.room_deleted",
  "room.snapshot",
  "room.settings_updated",
  "room.deleted",
  "room.host_changed",
  "moderation.room_locked",
]);

export class SocketCommandError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {string} [requestId]
   * @param {unknown} [cause]
   */
  constructor(message, code = "INTERNAL_ERROR", requestId = "", cause = undefined) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "SocketCommandError";
    this.code = code;
    this.requestId = requestId;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Validates ServerEventEnvelope, deduplicates eventIds via a bounded FIFO Set,
 * and enforces scoped monotonic version ordering for presence and room state events.
 */
export function createEnvelopeGuard({ maxSeenEvents = 1000 } = {}) {
  if (!Number.isInteger(maxSeenEvents) || maxSeenEvents < 1) {
    throw new RangeError("createEnvelopeGuard requires maxSeenEvents >= 1");
  }

  /** @type {Set<string>} */
  const seenEventIds = new Set();
  /** @type {Map<string, number>} */
  const lastVersions = new Map();

  function evaluate(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { accepted: false, reason: "invalid_envelope" };
    }
    if (raw.schemaVersion !== SOCKET_SCHEMA_VERSION) {
      return { accepted: false, reason: "invalid_schema_version" };
    }
    if (typeof raw.eventId !== "string" || raw.eventId.trim().length === 0) {
      return { accepted: false, reason: "missing_event_id" };
    }
    if (typeof raw.event !== "string" || !CANONICAL_SERVER_EVENTS.has(raw.event)) {
      return { accepted: false, reason: "unknown_event" };
    }
    if (typeof raw.occurredAt !== "string" || raw.occurredAt.trim().length === 0) {
      return { accepted: false, reason: "missing_occurred_at" };
    }
    if (!Number.isSafeInteger(raw.version) || raw.version < 0) {
      return { accepted: false, reason: "invalid_version" };
    }
    if (raw.data === undefined) {
      return { accepted: false, reason: "missing_data" };
    }

    if (seenEventIds.has(raw.eventId)) {
      return { accepted: false, reason: "duplicate_event_id" };
    }

    if (raw.event === "presence.snapshot" || raw.event === "presence.updated") {
      const scope = "presence";
      const lastVersion = lastVersions.get(scope);
      if (lastVersion !== undefined) {
        if (raw.event === "presence.snapshot" && raw.version < lastVersion) {
          return { accepted: false, reason: "stale_version" };
        }
        if (raw.event === "presence.updated" && raw.version <= lastVersion) {
          return { accepted: false, reason: "stale_version" };
        }
      }
      lastVersions.set(scope, raw.version);
    } else if (
      VERSIONED_ROOM_EVENTS.has(raw.event) &&
      raw.version > 0 &&
      typeof raw.roomId === "string" &&
      raw.roomId.trim().length > 0
    ) {
      const scope = `room:${raw.roomId}`;
      const lastVersion = lastVersions.get(scope);
      if (lastVersion !== undefined) {
        if (raw.event === "room.snapshot" && raw.version < lastVersion) {
          return { accepted: false, reason: "stale_version" };
        }
        if (raw.event !== "room.snapshot" && raw.version <= lastVersion) {
          return { accepted: false, reason: "stale_version" };
        }
      }
      lastVersions.set(scope, raw.version);
    }

    seenEventIds.add(raw.eventId);
    if (seenEventIds.size > maxSeenEvents) {
      const oldestEventId = seenEventIds.values().next().value;
      if (oldestEventId !== undefined) {
        seenEventIds.delete(oldestEventId);
      }
    }

    return { accepted: true, envelope: raw };
  }

  function reset() {
    seenEventIds.clear();
    lastVersions.clear();
  }

  return {
    evaluate,
    reset,
  };
}

/**
 * Tracks correlated Socket.IO command requestIds against server-emitted command.ack packets.
 */
export function createCommandTracker({ defaultTimeoutMs = 8000 } = {}) {
  let seq = 0;
  /** @type {Map<string, { resolve: (value: any) => void, reject: (err: Error) => void, timer: ReturnType<typeof setTimeout> | null }>} */
  const pendingAcks = new Map();

  function createRequestId() {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    seq += 1;
    return `req_${Date.now()}_${seq}`;
  }

  function register(requestId, { timeoutMs = defaultTimeoutMs } = {}) {
    if (typeof requestId !== "string" || requestId.trim().length === 0) {
      return Promise.reject(
        new SocketCommandError("requestId is required", "VALIDATION_ERROR", "")
      );
    }
    if (pendingAcks.has(requestId)) {
      return Promise.reject(
        new SocketCommandError(`Duplicate in-flight requestId: ${requestId}`, "CONFLICT", requestId)
      );
    }

    return new Promise((resolve, reject) => {
      let timer = null;
      if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timer = setTimeout(() => {
          if (!pendingAcks.has(requestId)) {
            return;
          }
          pendingAcks.delete(requestId);
          reject(
            new SocketCommandError(
              `Command timed out after ${timeoutMs}ms`,
              "TIMEOUT",
              requestId
            )
          );
        }, timeoutMs);
      }

      pendingAcks.set(requestId, { resolve, reject, timer });
    });
  }

  function resolveAck(rawAck) {
    if (!rawAck || typeof rawAck !== "object" || typeof rawAck.requestId !== "string") {
      return false;
    }

    const pending = pendingAcks.get(rawAck.requestId);
    if (!pending) {
      return false;
    }

    if (pending.timer !== null) {
      clearTimeout(pending.timer);
    }
    pendingAcks.delete(rawAck.requestId);

    if (rawAck.ok === true) {
      pending.resolve(rawAck.data);
    } else {
      const code =
        typeof rawAck.error?.code === "string" && rawAck.error.code.length > 0
          ? rawAck.error.code
          : "INTERNAL_ERROR";
      const message =
        typeof rawAck.error?.message === "string" && rawAck.error.message.length > 0
          ? rawAck.error.message
          : "Command failed";
      pending.reject(new SocketCommandError(message, code, rawAck.requestId));
    }

    return true;
  }

  function rejectAll(reason = "Socket disconnected") {
    const entries = Array.from(pendingAcks.entries());
    pendingAcks.clear();

    for (const [requestId, pending] of entries) {
      if (pending.timer !== null) {
        clearTimeout(pending.timer);
      }
      pending.reject(new SocketCommandError(reason, "DISCONNECTED", requestId));
    }
  }

  function pendingCount() {
    return pendingAcks.size;
  }

  function clear() {
    for (const pending of pendingAcks.values()) {
      if (pending.timer !== null) {
        clearTimeout(pending.timer);
      }
    }
    pendingAcks.clear();
  }

  return {
    createRequestId,
    register,
    resolveAck,
    rejectAll,
    pendingCount,
    clear,
  };
}
