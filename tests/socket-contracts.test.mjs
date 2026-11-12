import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_CLIENT_COMMANDS,
  CANONICAL_SERVER_EVENTS,
  SOCKET_SCHEMA_VERSION,
  SocketCommandError,
  VERSIONED_ROOM_EVENTS,
  createCommandTracker,
  createEnvelopeGuard,
} from "../lib/socket-protocol.mjs";

const EXPECTED_CANONICAL_EVENTS = [
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
];

let eventSeq = 0;

function makeEnvelope(overrides = {}) {
  eventSeq += 1;
  return {
    eventId: `evt_${eventSeq}`,
    event: "voice.speaking_changed",
    schemaVersion: SOCKET_SCHEMA_VERSION,
    occurredAt: "2026-11-11T12:00:00.000Z",
    roomId: "room-1",
    version: 0,
    data: { roomId: "room-1", userId: "user-1", isSpeaking: true, level: 0.7 },
    ...overrides,
  };
}

test("CANONICAL_SERVER_EVENTS and CANONICAL_CLIENT_COMMANDS enforce exact dot-separated contracts", () => {
  assert.equal(CANONICAL_SERVER_EVENTS.size, 22);
  assert.deepEqual([...CANONICAL_SERVER_EVENTS], EXPECTED_CANONICAL_EVENTS);

  for (const event of CANONICAL_SERVER_EVENTS) {
    assert.equal(event.includes(":"), false, `unexpected colon in event ${event}`);
    assert.equal(event.includes("."), true, `missing dot in event ${event}`);
  }

  for (const legacy of ["room:joined", "chat:send", "webrtc:signal", "command.ack"]) {
    assert.equal(CANONICAL_SERVER_EVENTS.has(legacy), false);
  }

  assert.equal(CANONICAL_CLIENT_COMMANDS.size, 17);
  for (const cmd of CANONICAL_CLIENT_COMMANDS) {
    assert.equal(cmd.includes(":"), false, `unexpected colon in command ${cmd}`);
    assert.equal(cmd.includes("."), true, `missing dot in command ${cmd}`);
  }

  for (const versionedEvent of VERSIONED_ROOM_EVENTS) {
    assert.equal(CANONICAL_SERVER_EVENTS.has(versionedEvent), true);
  }
});

test("createEnvelopeGuard accepts all 22 canonical events and rejects malformed envelopes", () => {
  const guard = createEnvelopeGuard();

  for (const [idx, event] of EXPECTED_CANONICAL_EVENTS.entries()) {
    const isPresence = event.startsWith("presence.");
    const env = makeEnvelope({
      eventId: `all22_${idx}`,
      event,
      roomId: isPresence ? undefined : `room-${idx}`,
      version: VERSIONED_ROOM_EVENTS.has(event) || isPresence ? idx + 1 : 0,
      data: { ok: true },
    });
    const res = guard.evaluate(env);
    assert.equal(res.accepted, true, `expected ${event} to be accepted`);
    if (res.accepted) {
      assert.deepEqual(res.envelope, env);
    }
  }

  const invalidCases = [
    [null, "invalid_envelope"],
    [[], "invalid_envelope"],
    ["raw-string", "invalid_envelope"],
    [makeEnvelope({ schemaVersion: 2 }), "invalid_schema_version"],
    [makeEnvelope({ schemaVersion: undefined }), "invalid_schema_version"],
    [makeEnvelope({ eventId: "" }), "missing_event_id"],
    [makeEnvelope({ eventId: "   " }), "missing_event_id"],
    [makeEnvelope({ event: "room:user-joined" }), "unknown_event"],
    [makeEnvelope({ event: "command.ack" }), "unknown_event"],
    [makeEnvelope({ occurredAt: "" }), "missing_occurred_at"],
    [makeEnvelope({ version: -1 }), "invalid_version"],
    [makeEnvelope({ version: 1.5 }), "invalid_version"],
    [makeEnvelope({ data: undefined }), "missing_data"],
  ];

  for (const [payload, expectedReason] of invalidCases) {
    const res = guard.evaluate(payload);
    assert.equal(res.accepted, false);
    if (!res.accepted) {
      assert.equal(res.reason, expectedReason);
    }
  }
});

test("createEnvelopeGuard deduplicates eventId and evicts oldest entry past maxSeenEvents", () => {
  const guard = createEnvelopeGuard({ maxSeenEvents: 3 });

  const e1 = makeEnvelope({ eventId: "evt-a", version: 0 });
  const e2 = makeEnvelope({ eventId: "evt-b", version: 0 });
  const e3 = makeEnvelope({ eventId: "evt-c", version: 0 });
  const e4 = makeEnvelope({ eventId: "evt-d", version: 0 });

  assert.equal(guard.evaluate(e1).accepted, true);
  const dup = guard.evaluate(e1);
  assert.equal(dup.accepted, false);
  if (!dup.accepted) {
    assert.equal(dup.reason, "duplicate_event_id");
  }

  assert.equal(guard.evaluate(e2).accepted, true);
  assert.equal(guard.evaluate(e3).accepted, true);
  // Adding 4th event evicts "evt-a" while retaining "evt-b" and "evt-c".
  assert.equal(guard.evaluate(e4).accepted, true);

  const dupB = guard.evaluate(e2);
  assert.equal(dupB.accepted, false);
  if (!dupB.accepted) {
    assert.equal(dupB.reason, "duplicate_event_id");
  }
  const dupC = guard.evaluate(e3);
  assert.equal(dupC.accepted, false);
  if (!dupC.accepted) {
    assert.equal(dupC.reason, "duplicate_event_id");
  }

  // "evt-a" was evicted FIFO, so replaying it succeeds deterministically.
  assert.equal(guard.evaluate(e1).accepted, true);
});

test("createEnvelopeGuard enforces scoped monotonic versioning without dropping stateless version=0 events", () => {
  const guard = createEnvelopeGuard();

  // Presence scope: snapshot >= last accepted, updated <= last rejected.
  assert.equal(
    guard.evaluate(
      makeEnvelope({
        eventId: "p-1",
        event: "presence.snapshot",
        roomId: undefined,
        version: 5,
        data: { onlineCount: 10 },
      })
    ).accepted,
    true
  );

  const stalePresenceUpdate = guard.evaluate(
    makeEnvelope({
      eventId: "p-2",
      event: "presence.updated",
      roomId: undefined,
      version: 5,
      data: { onlineCount: 11 },
    })
  );
  assert.equal(stalePresenceUpdate.accepted, false);
  if (!stalePresenceUpdate.accepted) {
    assert.equal(stalePresenceUpdate.reason, "stale_version");
  }

  assert.equal(
    guard.evaluate(
      makeEnvelope({
        eventId: "p-3",
        event: "presence.snapshot",
        roomId: undefined,
        version: 5,
        data: { onlineCount: 10 },
      })
    ).accepted,
    true
  );

  assert.equal(
    guard.evaluate(
      makeEnvelope({
        eventId: "p-4",
        event: "presence.updated",
        roomId: undefined,
        version: 6,
        data: { onlineCount: 12 },
      })
    ).accepted,
    true
  );

  // Room scope: lobby.room_updated <= last rejected; room.snapshot == last accepted; scoped per roomId.
  assert.equal(
    guard.evaluate(
      makeEnvelope({
        eventId: "r1-1",
        event: "lobby.room_updated",
        roomId: "room-alpha",
        version: 3,
      })
    ).accepted,
    true
  );

  const staleRoomUpdate = guard.evaluate(
    makeEnvelope({
      eventId: "r1-2",
      event: "lobby.room_updated",
      roomId: "room-alpha",
      version: 3,
    })
  );
  assert.equal(staleRoomUpdate.accepted, false);
  if (!staleRoomUpdate.accepted) {
    assert.equal(staleRoomUpdate.reason, "stale_version");
  }

  assert.equal(
    guard.evaluate(
      makeEnvelope({
        eventId: "r1-3",
        event: "room.snapshot",
        roomId: "room-alpha",
        version: 3,
      })
    ).accepted,
    true
  );

  // Independent room-beta scope is unaffected by room-alpha's version 3.
  assert.equal(
    guard.evaluate(
      makeEnvelope({
        eventId: "r2-1",
        event: "lobby.room_created",
        roomId: "room-beta",
        version: 1,
      })
    ).accepted,
    true
  );

  // Stateless version=0 events with distinct eventIds are never suppressed by monotonic version gating.
  for (const [idx, event] of [
    "webrtc.ice_candidate",
    "webrtc.ice_candidate",
    "voice.speaking_changed",
    "voice.speaking_changed",
    "chat.message_created",
    "chat.message_created",
    "screen_share.started",
    "moderation.participant_kicked",
  ].entries()) {
    assert.equal(
      guard.evaluate(
        makeEnvelope({
          eventId: `stateless-${idx}`,
          event,
          roomId: "room-alpha",
          version: 0,
        })
      ).accepted,
      true,
      `expected stateless ${event} (#${idx}) to be accepted`
    );
  }
});

test("createCommandTracker resolves out-of-order acks, preserves errors, ignores unknown acks, times out, and rejects on disconnect", async () => {
  const tracker = createCommandTracker({ defaultTimeoutMs: 500 });

  // Concurrent in-flight requestIds resolve out of order.
  const req1 = tracker.createRequestId();
  const req2 = tracker.createRequestId();
  assert.notEqual(req1, req2);

  const p1 = tracker.register(req1);
  const p2 = tracker.register(req2);
  assert.equal(tracker.pendingCount(), 2);

  assert.equal(
    tracker.resolveAck({ ok: true, requestId: req2, data: { roomId: "r2", left: true } }),
    true
  );
  assert.equal(
    tracker.resolveAck({ ok: true, requestId: req1, data: { subscribed: true } }),
    true
  );

  assert.deepEqual(await p2, { roomId: "r2", left: true });
  assert.deepEqual(await p1, { subscribed: true });
  assert.equal(tracker.pendingCount(), 0);

  // Failed ack rejects with SocketCommandError preserving code and requestId.
  const reqErr = tracker.createRequestId();
  const pErr = tracker.register(reqErr);
  assert.equal(
    tracker.resolveAck({
      ok: false,
      requestId: reqErr,
      error: { code: "FORBIDDEN", message: "Host only" },
    }),
    true
  );
  await assert.rejects(pErr, (err) => {
    assert.ok(err instanceof SocketCommandError);
    assert.equal(err.code, "FORBIDDEN");
    assert.equal(err.requestId, reqErr);
    assert.equal(err.message, "Host only");
    return true;
  });

  // Unknown or malformed command.ack returns false without throwing.
  assert.equal(tracker.resolveAck(null), false);
  assert.equal(tracker.resolveAck({ ok: true }), false);
  assert.equal(tracker.resolveAck({ ok: true, requestId: "unknown-id", data: {} }), false);
  assert.equal(tracker.resolveAck({ ok: true, requestId: req1, data: {} }), false);

  // Command timeout triggers SocketCommandError with code === "TIMEOUT".
  const reqTimeout = tracker.createRequestId();
  const pTimeout = tracker.register(reqTimeout, { timeoutMs: 25 });
  await assert.rejects(pTimeout, (err) => {
    assert.ok(err instanceof SocketCommandError);
    assert.equal(err.code, "TIMEOUT");
    assert.equal(err.requestId, reqTimeout);
    return true;
  });
  assert.equal(tracker.pendingCount(), 0);

  // rejectAll rejects all pending commands immediately on disconnect.
  const d1 = tracker.createRequestId();
  const d2 = tracker.createRequestId();
  const dp1 = tracker.register(d1, { timeoutMs: 5000 });
  const dp2 = tracker.register(d2, { timeoutMs: 5000 });
  assert.equal(tracker.pendingCount(), 2);

  tracker.rejectAll("socket disconnected");
  assert.equal(tracker.pendingCount(), 0);

  for (const [promise, id] of [
    [dp1, d1],
    [dp2, d2],
  ]) {
    await assert.rejects(promise, (err) => {
      assert.ok(err instanceof SocketCommandError);
      assert.equal(err.code, "DISCONNECTED");
      assert.equal(err.requestId, id);
      assert.equal(err.message, "socket disconnected");
      return true;
    });
  }
});
