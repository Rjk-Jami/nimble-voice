import assert from "node:assert/strict";
import test from "node:test";
import { parsePresenceEvent } from "../lib/presence/protocol.mjs";

test("accepts sync and count envelopes with non-negative integer counts", () => {
  assert.deepEqual(
    parsePresenceEvent('{"version":1,"type":"presence:sync","data":{"onlineLearners":12}}'),
    { version: 1, type: "presence:sync", data: { onlineLearners: 12 } }
  );
  assert.equal(
    parsePresenceEvent('{"version":1,"type":"presence:count","data":{"onlineLearners":0}}').data.onlineLearners,
    0
  );
});

test("rejects malformed, unknown, negative, and fractional messages", () => {
  for (const raw of [
    "not json",
    "null",
    "{}",
    '{"version":1,"type":"presence:count","data":{"onlineLearners":-1}}',
    '{"version":1,"type":"presence:sync","data":{"onlineLearners":1.5}}',
    '{"version":1,"type":"presence:fake","data":{"onlineLearners":3}}',
    '{"version":2,"type":"presence:count","data":{"onlineLearners":3}}',
  ]) {
    assert.equal(parsePresenceEvent(raw), null, raw);
  }
});
