import assert from "node:assert/strict";
import test from "node:test";
import {
  createLobbyStore,
  reduceMergeServerRooms,
  reduceApplyRoomCreated,
  reduceApplyRoomUpdated,
  reduceApplyRoomDeleted,
} from "../lib/lobby-store-core.mjs";

function sampleRoom(id, overrides = {}) {
  return {
    id,
    title: `Room ${id}`,
    topic: "General Chat",
    language: "English",
    flag: "🇬🇧",
    cefrLevel: "B2",
    levelLabel: "Intermediate",
    maxSlots: 5,
    currentSlots: 1,
    tags: ["fluent"],
    status: "LIVE",
    startedAt: "2026-11-16T00:00:00Z",
    activeSinceMinutes: 10,
    hasFreeSeats: true,
    isBeginnerFriendly: false,
    hasNativeSpeaker: false,
    isLive: true,
    host: { id: "host-1", name: "Host One" },
    participants: [{ id: "host-1", name: "Host One", isHost: true }],
    messages: [],
    ...overrides,
  };
}

test("mergeServerRooms ignores rooms in closedRooms tombstone set", () => {
  const store = createLobbyStore();

  // 1. Initial room arrives via socket or REST
  store.applyRoomCreated(sampleRoom("room-1"), 1);
  assert.equal(store.getState().roomsById["room-1"] !== undefined, true);

  // 2. Room is deleted via socket delta
  store.applyRoomDeleted("room-1", 2);
  assert.equal(store.getState().roomsById["room-1"], undefined);
  assert.equal(store.getState().closedRooms["room-1"], true);

  // 3. Stale background REST fetch arrives containing room-1
  store.mergeServerRooms([sampleRoom("room-1"), sampleRoom("room-2")]);

  // Assert: room-1 was NOT resurrected by stale SWR response
  assert.equal(store.getState().roomsById["room-1"], undefined);
  assert.equal(store.getState().closedRooms["room-1"], true);

  // Assert: room-2 was cleanly merged
  assert.equal(store.getState().roomsById["room-2"] !== undefined, true);
  assert.equal(store.getState().roomVersions["room-2"], 0);
  assert.equal(store.getState().rooms.length, 1);
});

test("mergeServerRooms does not overwrite live participant/slot updates on active rooms", () => {
  const store = createLobbyStore();

  // 1. Initial room in store with socket delta version 3 and 4/5 participants
  store.applyRoomCreated(
    sampleRoom("room-1", {
      currentSlots: 4,
      maxSlots: 5,
      hasFreeSeats: true,
      participants: [
        { id: "u1", name: "Alice" },
        { id: "u2", name: "Bob" },
        { id: "u3", name: "Charlie" },
        { id: "u4", name: "David" },
      ],
    }),
    3
  );

  assert.equal(store.getState().roomVersions["room-1"], 3);
  assert.equal(store.getState().roomsById["room-1"].currentSlots, 4);
  assert.equal(store.getState().roomsById["room-1"].participants.length, 4);

  // 2. REST fetch returns stale snapshot where room-1 had only 1 slot and 1 participant
  const staleServerRooms = [
    sampleRoom("room-1", {
      title: "Updated Title From DB",
      currentSlots: 1,
      participants: [{ id: "u1", name: "Alice" }],
    }),
  ];

  store.mergeServerRooms(staleServerRooms);

  const roomAfterMerge = store.getState().roomsById["room-1"];
  // Metadata like title should update from DB
  assert.equal(roomAfterMerge.title, "Updated Title From DB");
  // Live fields MUST be preserved from socket version 3
  assert.equal(roomAfterMerge.currentSlots, 4);
  assert.equal(roomAfterMerge.participants.length, 4);
  assert.equal(store.getState().roomVersions["room-1"], 3);
});

test("applyRoomUpdated rejects stale or out-of-order version updates", () => {
  const store = createLobbyStore();

  // Room at version 5
  store.applyRoomCreated(sampleRoom("room-1", { currentSlots: 3 }), 5);

  // Delta arrives with version 4 (stale)
  store.applyRoomUpdated("room-1", { currentSlots: 2 }, 4);
  assert.equal(store.getState().roomsById["room-1"].currentSlots, 3);
  assert.equal(store.getState().roomVersions["room-1"], 5);

  // Delta arrives with version 5 (duplicate / already applied)
  store.applyRoomUpdated("room-1", { currentSlots: 1 }, 5);
  assert.equal(store.getState().roomsById["room-1"].currentSlots, 3);
  assert.equal(store.getState().roomVersions["room-1"], 5);

  // Delta arrives with version 6 (strictly greater -> accepted)
  store.applyRoomUpdated("room-1", { currentSlots: 4 }, 6);
  assert.equal(store.getState().roomsById["room-1"].currentSlots, 4);
  assert.equal(store.getState().roomVersions["room-1"], 6);
});

test("applyRoomDeleted marks tombstone and deletes entity from roomsById", () => {
  const store = createLobbyStore();

  store.applyRoomCreated(sampleRoom("room-abc"), 2);
  assert.equal(store.getState().roomsById["room-abc"] !== undefined, true);

  store.applyRoomDeleted("room-abc", 3);
  assert.equal(store.getState().roomsById["room-abc"], undefined);
  assert.equal(store.getState().closedRooms["room-abc"], true);
  assert.equal(store.getState().roomVersions["room-abc"], 3);
  assert.equal(store.getState().rooms.some((r) => r.id === "room-abc"), false);

  // Attempting to update a deleted room does nothing
  store.applyRoomUpdated("room-abc", { title: "Resurrect?" }, 4);
  assert.equal(store.getState().roomsById["room-abc"], undefined);
});

test("applyRoomCreated clears previous tombstone if same ID is re-created", () => {
  const store = createLobbyStore();

  store.applyRoomCreated(sampleRoom("room-reused"), 1);
  store.applyRoomDeleted("room-reused", 2);
  assert.equal(store.getState().closedRooms["room-reused"], true);

  // User recreates room with same ID in the same session
  store.applyRoomCreated(sampleRoom("room-reused", { title: "Reborn Room" }), 3);
  assert.equal(store.getState().closedRooms["room-reused"], undefined);
  assert.equal(store.getState().roomsById["room-reused"] !== undefined, true);
  assert.equal(store.getState().roomsById["room-reused"].title, "Reborn Room");
  assert.equal(store.getState().roomVersions["room-reused"], 3);
});
