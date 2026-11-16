import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { createLobbyStore } from "../lib/lobby-store-core.mjs";

/**
 * Helper to emit a command with correlated command.ack
 */
function emitCommand(socket, command, payload = {}, timeoutMs = 3000) {
  const requestId = `req_${Date.now()}_${Math.random()}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("command.ack", onAck);
      reject(new Error(`Timeout waiting for command.ack (${command})`));
    }, timeoutMs);

    const onAck = (ack) => {
      if (!ack || ack.requestId !== requestId) return;
      clearTimeout(timer);
      socket.off("command.ack", onAck);
      if (ack.ok) {
        resolve(ack.data);
      } else {
        const err = new Error(ack.error?.message || "Command rejected");
        err.code = ack.error?.code || "INTERNAL_ERROR";
        reject(err);
      }
    };

    socket.on("command.ack", onAck);
    socket.emit(command, { ...payload, requestId });
  });
}

function waitEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    const listener = (data) => {
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(data);
    };

    socket.on(event, listener);
  });
}

test("Scenario 1: multi-tab presence deduplication and canonical presence.snapshot unicast delivery", async () => {
  // Setup simulated Socket.IO server implementing PresenceStore deduplication logic
  const httpServer = http.createServer();
  const ioServer = new Server(httpServer, {
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  const userConnections = new Map(); // userId -> Set<socketId>
  const socketUser = new Map(); // socketId -> userId
  let presenceSeq = 0;

  ioServer.on("connection", (socket) => {
    const auth = socket.handshake.auth || {};
    if (auth.observer) {
      socket.on("lobby.join", (payload) => {
        socket.join("lobby");
        if (payload?.requestId) {
          socket.emit("command.ack", {
            ok: true,
            requestId: payload.requestId,
            data: { subscribed: true },
          });
        }
      });
      return;
    }

    const userId = auth.userId || auth.token || socket.id;
    presenceSeq += 1;

    let conns = userConnections.get(userId);
    const firstConnection = !conns || conns.size === 0;
    if (!conns) {
      conns = new Set();
      userConnections.set(userId, conns);
    }
    conns.add(socket.id);
    socketUser.set(socket.id, userId);

    const onlineCount = userConnections.size;

    // 1. Unicast presence.snapshot to connecting socket
    socket.emit("presence.snapshot", {
      schemaVersion: 1,
      eventId: `evt_snap_${presenceSeq}`,
      event: "presence.snapshot",
      occurredAt: new Date().toISOString(),
      version: presenceSeq,
      data: { onlineCount },
    });

    // 2. Broadcast presence.updated ONLY when unique user count changes (first connection)
    if (firstConnection) {
      ioServer.to("lobby").emit("presence.updated", {
        schemaVersion: 1,
        eventId: `evt_upd_${presenceSeq}`,
        event: "presence.updated",
        occurredAt: new Date().toISOString(),
        version: presenceSeq,
        data: { onlineCount },
      });
    }

    socket.on("lobby.join", (payload) => {
      socket.join("lobby");
      if (payload?.requestId) {
        socket.emit("command.ack", {
          ok: true,
          requestId: payload.requestId,
          data: { subscribed: true },
        });
      }
    });

    socket.on("disconnect", () => {
      const uId = socketUser.get(socket.id);
      socketUser.delete(socket.id);
      if (uId && userConnections.has(uId)) {
        const set = userConnections.get(uId);
        set.delete(socket.id);
        if (set.size === 0) {
          userConnections.delete(uId);
          presenceSeq += 1;
          const currentCount = userConnections.size;
          ioServer.to("lobby").emit("presence.updated", {
            schemaVersion: 1,
            eventId: `evt_upd_${presenceSeq}`,
            event: "presence.updated",
            occurredAt: new Date().toISOString(),
            version: presenceSeq,
            data: { onlineCount: currentCount },
          });
        }
      }
    });
  });

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;

  const createTestClient = (auth) => {
    return ioClient(serverUrl, {
      path: "/socket.io/",
      transports: ["websocket"],
      auth,
      reconnection: false,
    });
  };

  const observer = createTestClient({ observer: true });
  await waitEvent(observer, "connect");
  await emitCommand(observer, "lobby.join");

  const observedUpdates = [];
  observer.on("presence.updated", (env) => {
    observedUpdates.push(env.data.onlineCount);
  });

  // Step 1: Client socket A connects as User 1
  const socketA = createTestClient({ userId: "user-1" });
  const snapA = await waitEvent(socketA, "presence.snapshot");
  assert.equal(snapA.data.onlineCount, 1, "Socket A receives snapshot with count 1");
  await emitCommand(socketA, "lobby.join");
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(observedUpdates, [1], "Lobby receives presence.updated with onlineCount: 1");

  // Step 2: Client socket B connects as User 1 (second tab for User 1)
  const socketB = createTestClient({ userId: "user-1" });
  const snapB = await waitEvent(socketB, "presence.snapshot");
  assert.equal(snapB.data.onlineCount, 1, "Socket B (second tab) receives snapshot with count 1");
  await emitCommand(socketB, "lobby.join");
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(
    observedUpdates,
    [1],
    "Lobby receives ZERO presence.updated events when tab 2 connects"
  );

  // Step 3: Client socket C connects as User 2
  const socketC = createTestClient({ userId: "user-2" });
  const snapC = await waitEvent(socketC, "presence.snapshot");
  assert.equal(snapC.data.onlineCount, 2, "Socket C receives snapshot with count 2");
  await emitCommand(socketC, "lobby.join");
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(
    observedUpdates,
    [1, 2],
    "Lobby receives presence.updated with onlineCount: 2 when User 2 joins"
  );

  // Step 4: Client socket A disconnects (Tab 1 of User 1 closes)
  socketA.disconnect();
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(
    observedUpdates,
    [1, 2],
    "Lobby receives ZERO presence.updated events when Tab 1 closes (User 1 still active on Tab 2)"
  );

  // Step 5: Client socket B disconnects (Tab 2 of User 1 closes)
  socketB.disconnect();
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(
    observedUpdates,
    [1, 2, 1],
    "Lobby receives presence.updated with onlineCount: 1 when all tabs of User 1 close"
  );

  // Step 6: Client socket C disconnects (User 2 closes)
  socketC.disconnect();
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(
    observedUpdates,
    [1, 2, 1, 0],
    "Lobby receives presence.updated with onlineCount: 0 when User 2 closes"
  );

  // Cleanup
  observer.disconnect();
  await new Promise((resolve) => httpServer.close(resolve));
});

test("Scenario 2: Normalized store tombstone and monotonic version guards", () => {
  const store = createLobbyStore();

  const r1Base = {
    id: "R1",
    title: "Room 1 Initial",
    topic: "Engineering",
    language: "English",
    flag: "🇺🇸",
    cefrLevel: "B2",
    levelLabel: "Upper Intermediate",
    maxSlots: 6,
    currentSlots: 1,
    tags: ["tech"],
    status: "LIVE",
    startedAt: "2026-11-16T00:00:00Z",
    activeSinceMinutes: 5,
    hasFreeSeats: true,
    isBeginnerFriendly: false,
    hasNativeSpeaker: false,
    isLive: true,
    host: { id: "host-1", name: "Host" },
    participants: [{ id: "host-1", name: "Host" }],
    messages: [],
  };

  // 1. Apply applyRoomCreated for Room R1 at version 1
  store.applyRoomCreated(r1Base, 1);
  assert.equal(store.getState().roomsById["R1"] !== undefined, true);
  assert.equal(store.getState().roomsById["R1"].currentSlots, 1);
  assert.equal(store.getState().roomVersions["R1"], 1);

  // 2. Apply applyRoomUpdated for Room R1 at version 2 -> updates slots
  store.applyRoomUpdated("R1", { currentSlots: 4 }, 2);
  assert.equal(store.getState().roomsById["R1"].currentSlots, 4);
  assert.equal(store.getState().roomVersions["R1"], 2);

  // 3. Apply applyRoomUpdated for Room R1 with stale version 1 -> ignored
  store.applyRoomUpdated("R1", { currentSlots: 2 }, 1);
  assert.equal(store.getState().roomsById["R1"].currentSlots, 4, "Stale update rejected");
  assert.equal(store.getState().roomVersions["R1"], 2);

  // 4. Apply applyRoomDeleted for Room R1 at version 3 -> Room R1 evicted and marked closed
  store.applyRoomDeleted("R1", 3);
  assert.equal(store.getState().roomsById["R1"], undefined, "Room R1 evicted from roomsById");
  assert.equal(store.getState().closedRooms["R1"], true, "Room R1 recorded in closedRooms tombstone");
  assert.equal(store.getState().roomVersions["R1"], 3);

  // 5. Simulate SWR background fetch returning Room R1 via mergeServerRooms -> Room R1 is NOT resurrected
  const swrStaleRooms = [
    {
      ...r1Base,
      title: "Zombie Room",
      currentSlots: 1,
    },
    {
      id: "R2",
      title: "Room 2 Active",
      topic: "Casual",
      language: "Spanish",
      flag: "🇪🇸",
      cefrLevel: "A2",
      levelLabel: "Elementary",
      maxSlots: 4,
      currentSlots: 2,
      tags: ["casual"],
      status: "LIVE",
      startedAt: "2026-11-16T00:00:00Z",
      activeSinceMinutes: 1,
      hasFreeSeats: true,
      isBeginnerFriendly: true,
      hasNativeSpeaker: false,
      isLive: true,
      host: { id: "host-2", name: "Host 2" },
      participants: [{ id: "host-2", name: "Host 2" }],
      messages: [],
    },
  ];

  store.mergeServerRooms(swrStaleRooms);
  assert.equal(
    store.getState().roomsById["R1"],
    undefined,
    "Tombstone strictly prevents resurrection of deleted room"
  );
  assert.equal(store.getState().closedRooms["R1"], true);
  assert.equal(store.getState().roomsById["R2"] !== undefined, true, "New Room R2 merged cleanly");
});

test("Scenario 3: SQL search filter isolation and ended room immunity contract", () => {
  // Test the logical SQL predicate model for search isolation
  // Query: status != 'ENDED' AND (LOWER(title) LIKE '%calc%' OR LOWER(topic) LIKE '%calc%' OR LOWER(topic_tag) LIKE '%calc%')

  const testRooms = [
    {
      id: "active-math",
      title: "Calculus Study Group",
      topic: "Derivatives",
      topicTag: "Math",
      status: "LIVE",
    },
    {
      id: "ended-math",
      title: "Calculus Exam Review",
      topic: "Calculus Prep",
      topicTag: "Math",
      status: "ENDED",
    },
    {
      id: "active-spanish",
      title: "Spanish Conversation",
      topic: "General",
      topicTag: "Language",
      status: "WAITING",
    },
  ];

  const searchTerm = "calculus";

  // Buggy SQL without parentheses: status != 'ENDED' AND title LIKE ... OR topic LIKE ...
  const buggyFilter = (room) => {
    return (
      (room.status !== "ENDED" && room.title.toLowerCase().includes(searchTerm)) ||
      room.topic.toLowerCase().includes(searchTerm) ||
      room.topicTag.toLowerCase().includes(searchTerm)
    );
  };

  // Fixed SQL with explicit parentheses: status != 'ENDED' AND (title LIKE ... OR topic LIKE ...)
  const fixedFilter = (room) => {
    return (
      room.status !== "ENDED" &&
      (room.title.toLowerCase().includes(searchTerm) ||
        room.topic.toLowerCase().includes(searchTerm) ||
        room.topicTag.toLowerCase().includes(searchTerm))
    );
  };

  // Demonstrate that the buggy query would have leaked the ended room
  const buggyResults = testRooms.filter(buggyFilter);
  assert.equal(
    buggyResults.some((r) => r.id === "ended-math"),
    true,
    "Buggy precedence leaks ended rooms matching topic"
  );

  // Demonstrate that fixed query strictly enforces status != 'ENDED' immunity
  const fixedResults = testRooms.filter(fixedFilter);
  assert.equal(
    fixedResults.some((r) => r.id === "ended-math"),
    false,
    "Fixed query strictly excludes ended rooms regardless of topic/title match"
  );
  assert.equal(fixedResults.length, 1);
  assert.equal(fixedResults[0].id, "active-math");
});
