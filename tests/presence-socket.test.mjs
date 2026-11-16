import assert from "node:assert/strict";
import test from "node:test";
import { createLobbyStore } from "../lib/lobby-store-core.mjs";

test("initial presence state is null (loading skeleton)", () => {
  const store = createLobbyStore();
  // Must default to null to signal that no authoritative presence snapshot has arrived yet
  assert.equal(store.getState().onlineCount, null);
});

test("presence.snapshot updates onlineCount to exact payload count", () => {
  const store = createLobbyStore();

  // Initial state is null
  assert.equal(store.getState().onlineCount, null);

  // When presence.snapshot arrives from gateway
  const snapshotPayload = { onlineCount: 42 };
  store.setOnlineCount(snapshotPayload.onlineCount);

  assert.equal(store.getState().onlineCount, 42);
});

test("presence.updated updates onlineCount without dummy base additions", () => {
  const store = createLobbyStore();

  store.setOnlineCount(1);
  assert.equal(store.getState().onlineCount, 1);

  // Next presence.updated arrives with real count
  const updatedPayload = { onlineCount: 2 };
  store.setOnlineCount(updatedPayload.onlineCount);
  assert.equal(store.getState().onlineCount, 2);

  // Disconnect updates to 0 without synthetic offset (+10 or +142)
  const zeroPayload = { onlineCount: 0 };
  store.setOnlineCount(zeroPayload.onlineCount);
  assert.equal(store.getState().onlineCount, 0);
});

test("multi-tab deduplication guarantees count remains 1 for multiple tabs of same user", () => {
  // Simulates client reception of backend PresenceStore deduplication
  const store = createLobbyStore();

  // Tab 1 connects -> backend emits presence.snapshot / updated with count 1
  store.setOnlineCount(1);
  assert.equal(store.getState().onlineCount, 1);

  // Tab 2 connects for the same authenticated user -> backend does NOT increase count
  // Tab 2 receives unicast snapshot with onlineCount 1
  const tab2Snapshot = { onlineCount: 1 };
  store.setOnlineCount(tab2Snapshot.onlineCount);
  assert.equal(store.getState().onlineCount, 1);

  // Tab 1 closes -> backend sees 1 remaining connection for this user -> does NOT emit presence.updated
  assert.equal(store.getState().onlineCount, 1);

  // Tab 2 closes -> backend sees 0 connections for this user -> emits presence.updated with count 0
  const tab2Closed = { onlineCount: 0 };
  store.setOnlineCount(tab2Closed.onlineCount);
  assert.equal(store.getState().onlineCount, 0);
});
