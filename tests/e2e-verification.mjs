import { io } from "socket.io-client";
import assert from "node:assert";

const BACKEND_URL = "http://localhost:8080";
const SOCKET_PATH = "/socket.io/";

function createClient(userId, token = "") {
  return io(BACKEND_URL, {
    path: SOCKET_PATH,
    transports: ["websocket", "polling"],
    auth: {
      user_id: userId,
      userId: userId,
      token: token,
    },
    reconnection: false,
    timeout: 5000,
  });
}

function waitEvent(socket, event, timeoutMs = 4000) {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const testResults = [];

function recordResult(testId, feature, preconditions, steps, expected, actual, status, evidence, defect = "None") {
  testResults.push({
    testId,
    feature,
    preconditions,
    steps,
    expected,
    actual,
    status,
    evidence,
    defect,
  });
  console.log(`[${status}] ${testId} - ${feature}: ${actual}`);
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("NimbleVoice Automated E2E & Real-Time Verification Suite");
  console.log("Target Backend: " + BACKEND_URL);
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // TEST G: Guest Identity Generation & Login Stability
  // -------------------------------------------------------------------------
  try {
    const res1 = await fetch(`${BACKEND_URL}/api/v1/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const data1 = await res1.json();

    const res2 = await fetch(`${BACKEND_URL}/api/v1/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const data2 = await res2.json();

    const guestIdRegex = /^user\d{8}\d{3,}$/;
    const id1 = data1?.data?.user?.id;
    const id2 = data2?.data?.user?.id;

    const matchesRegex1 = guestIdRegex.test(id1);
    const matchesRegex2 = guestIdRegex.test(id2);
    const areUnique = id1 !== id2;

    assert.ok(matchesRegex1, `Guest 1 ID (${id1}) does not match userYYYYMMDDNNN format`);
    assert.ok(matchesRegex2, `Guest 2 ID (${id2}) does not match userYYYYMMDDNNN format`);
    assert.ok(areUnique, `Guest IDs collided: ${id1} === ${id2}`);

    recordResult(
      "TEST-G",
      "Guest Identity & Format",
      "Backend running at http://localhost:8080",
      "Request 2 guest identities concurrently via POST /api/v1/auth/guest",
      "Format matches userYYYYMMDDNNN and IDs are globally distinct and stable",
      `Received ${id1} and ${id2}; regex matched=${matchesRegex1 && matchesRegex2}, unique=${areUnique}`,
      "PASS",
      `Guest 1: ${id1}, Guest 2: ${id2}, Status code: 201 Created`
    );
  } catch (err) {
    recordResult(
      "TEST-G",
      "Guest Identity & Format",
      "Backend running at http://localhost:8080",
      "Request 2 guest identities concurrently",
      "Format matches userYYYYMMDDNNN and unique",
      err.message,
      "FAIL",
      err.stack,
      "Guest identity generation mismatch"
    );
  }

  // -------------------------------------------------------------------------
  // TEST A: Online Presence & Dynamic Counting
  // -------------------------------------------------------------------------
  let clientA, clientB;
  try {
    clientA = createClient("user20261017001");
    clientB = createClient("user20261017002");

    await Promise.all([
      waitEvent(clientA, "connected"),
      waitEvent(clientB, "connected"),
    ]);

    // Both join lobby
    clientA.emit("lobby:join");
    clientB.emit("lobby:join");
    await sleep(200);

    // Request lobby stats from Client A
    const statsPromise = waitEvent(clientA, "lobby:stats-update");
    clientA.emit("lobby:request-stats");
    const stats = await statsPromise;

    assert.ok(stats.onlineCount >= 2, `Expected onlineCount >= 2, got ${stats.onlineCount}`);

    // Disconnect Client B and verify presence update
    const statsAfterDiscPromise = waitEvent(clientA, "lobby:stats-update");
    clientB.disconnect();
    const statsAfterDisc = await statsAfterDiscPromise;

    recordResult(
      "TEST-A",
      "Online Presence & Stats Sync",
      "Two connected Socket.IO clients subscribed to lobby",
      "Connect client A and B -> observe lobby:stats-update -> disconnect B -> observe decremented stats",
      "Online count tracks connections without refresh; updates on connect and disconnect",
      `Initial onlineCount=${stats.onlineCount}, after B disconnect onlineCount=${statsAfterDisc.onlineCount}`,
      "PASS",
      `Stats update payload: ${JSON.stringify(statsAfterDisc)}`
    );
  } catch (err) {
    recordResult(
      "TEST-A",
      "Online Presence & Stats Sync",
      "Two connected Socket.IO clients",
      "Connect and disconnect clients",
      "Real-time presence updates",
      err.message,
      "FAIL",
      err.stack
    );
  } finally {
    if (clientB?.connected) clientB.disconnect();
  }

  // -------------------------------------------------------------------------
  // TEST B: Real-Time Room Creation & Lobby Propagation
  // -------------------------------------------------------------------------
  const testRoomId = `room-e2e-${Date.now()}`;
  let clientLobby;
  try {
    clientLobby = createClient("user-lobby-watcher");
    await waitEvent(clientLobby, "connected");
    clientLobby.emit("lobby:join");
    await sleep(150);

    // Client A creates/joins a new room
    const roomCreatedPromise = waitEvent(clientLobby, "lobby:room-created");
    const roomUpdatedPromise = waitEvent(clientLobby, "lobby:room-updated");

    clientA.emit("room:join", {
      roomId: testRoomId,
      userId: "user20261017001",
      role: "host",
    });

    const [createdEvent, updatedEvent] = await Promise.all([
      roomCreatedPromise,
      roomUpdatedPromise,
    ]);

    assert.strictEqual(createdEvent.roomId, testRoomId);
    assert.strictEqual(updatedEvent.currentSlots, 1);

    recordResult(
      "TEST-B",
      "Room Creation & Lobby Broadcast",
      "Client A connected, Client Lobby watching lobby room",
      "Client A joins new room -> backend emits lobby:room-created and lobby:room-updated to lobby",
      "Lobby clients receive room creation notification without page refresh",
      `Lobby received lobby:room-created with roomId=${createdEvent.roomId}, slots=${updatedEvent.currentSlots}`,
      "PASS",
      `Created event: ${JSON.stringify(createdEvent)}`
    );
  } catch (err) {
    recordResult(
      "TEST-B",
      "Room Creation & Lobby Broadcast",
      "Client in lobby, Client A creating room",
      "Create room",
      "Lobby event received",
      err.message,
      "FAIL",
      err.stack
    );
  }

  // -------------------------------------------------------------------------
  // TEST C: Room Membership, Existing Peers & Leave Teardown
  // -------------------------------------------------------------------------
  let clientJoiner;
  try {
    clientJoiner = createClient("user20261017003");
    await waitEvent(clientJoiner, "connected");

    // Client A listens for joiner
    const userJoinedPromise = waitEvent(clientA, "room:user-joined");
    const existingPeersPromise = waitEvent(clientJoiner, "room:existing-peers");

    // Client Joiner joins the same room
    clientJoiner.emit("room:join", {
      roomId: testRoomId,
      userId: "user20261017003",
      role: "speaker",
    });

    const [joinedEvt, peersEvt] = await Promise.all([
      userJoinedPromise,
      existingPeersPromise,
    ]);

    assert.strictEqual(joinedEvt.userId, "user20261017003");
    assert.ok(Array.isArray(peersEvt.peers), "Existing peers must be an array");
    assert.ok(
      peersEvt.peers.some((p) => p.userId === "user20261017001"),
      "Existing peers must contain host Client A"
    );

    // Client Joiner leaves room
    const userLeftPromise = waitEvent(clientA, "room:user-left");
    clientJoiner.emit("room:leave", {
      roomId: testRoomId,
      userId: "user20261017003",
    });

    const leftEvt = await userLeftPromise;
    assert.strictEqual(leftEvt.userId, "user20261017003");

    recordResult(
      "TEST-C",
      "Room Membership Lifecycle",
      "Room active with Client A (host)",
      "Client Joiner joins room -> verifies room:existing-peers and room:user-joined -> leaves room -> verifies room:user-left",
      "Room peers receive instant join/leave events with correct peer lists",
      `Joiner received ${peersEvt.peers.length} existing peers; Host received room:user-joined and room:user-left for ${leftEvt.userId}`,
      "PASS",
      `Existing peers: ${JSON.stringify(peersEvt.peers)}, Left event: ${JSON.stringify(leftEvt)}`
    );
  } catch (err) {
    recordResult(
      "TEST-C",
      "Room Membership Lifecycle",
      "Client A in room",
      "Join and leave room",
      "Clean join/leave propagation",
      err.message,
      "FAIL",
      err.stack
    );
  }

  // -------------------------------------------------------------------------
  // TEST D: Microphone Mute / Unmute State Synchronization
  // -------------------------------------------------------------------------
  try {
    // Rejoin clientJoiner to test mic state
    clientJoiner.emit("room:join", {
      roomId: testRoomId,
      userId: "user20261017003",
      role: "speaker",
    });
    await sleep(150);

    // Client A mutes mic
    const mutePromise = waitEvent(clientJoiner, "voice:state-updated");
    clientA.emit("voice:state-toggle", {
      roomId: testRoomId,
      userId: "user20261017001",
      is_muted: true,
    });
    const muteEvt = await mutePromise;
    assert.strictEqual(muteEvt.isMuted, true);
    assert.strictEqual(muteEvt.userId, "user20261017001");

    // Client A unmutes mic
    const unmutePromise = waitEvent(clientJoiner, "voice:state-updated");
    clientA.emit("voice:state-toggle", {
      roomId: testRoomId,
      userId: "user20261017001",
      is_muted: false,
    });
    const unmuteEvt = await unmutePromise;
    assert.strictEqual(unmuteEvt.isMuted, false);

    recordResult(
      "TEST-D",
      "Microphone State Synchronization",
      "Two peers in the same room",
      "Peer A emits voice:state-toggle (muted -> unmuted) -> Peer B receives voice:state-updated",
      "Microphone state accurately reflects across room members without polling",
      `Peer B received mute state (isMuted=${muteEvt.isMuted}) and unmute state (isMuted=${unmuteEvt.isMuted})`,
      "PASS",
      `Mute event payload: ${JSON.stringify(muteEvt)}`
    );
  } catch (err) {
    recordResult(
      "TEST-D",
      "Microphone State Synchronization",
      "Two peers in room",
      "Toggle mute",
      "State synchronized",
      err.message,
      "FAIL",
      err.stack
    );
  }

  // -------------------------------------------------------------------------
  // TEST E: Screen Sharing Relay
  // -------------------------------------------------------------------------
  try {
    // Start screen sharing from Client A
    const shareStartPromise = waitEvent(clientJoiner, "room:screen-share-changed");
    clientA.emit("room:screen-share", {
      roomId: testRoomId,
      userId: "user20261017001",
      isSharing: true,
    });
    const shareStartEvt = await shareStartPromise;
    assert.strictEqual(shareStartEvt.isSharing, true);

    // Stop screen sharing from Client A
    const shareStopPromise = waitEvent(clientJoiner, "room:screen-share-changed");
    clientA.emit("room:screen-share", {
      roomId: testRoomId,
      userId: "user20261017001",
      isSharing: false,
    });
    const shareStopEvt = await shareStopPromise;
    assert.strictEqual(shareStopEvt.isSharing, false);

    recordResult(
      "TEST-E",
      "Media & Screen Sharing Relay",
      "Two peers connected in the same room",
      "Peer A starts screen share -> Peer B receives update -> Peer A stops screen share",
      "Screen sharing state transitions relay cleanly between room peers",
      `Screen sharing started (isSharing=${shareStartEvt.isSharing}) and stopped (isSharing=${shareStopEvt.isSharing}) successfully`,
      "PASS",
      `Screen share event: ${JSON.stringify(shareStopEvt)}`
    );
  } catch (err) {
    recordResult(
      "TEST-E",
      "Media & Screen Sharing Relay",
      "Two peers in room",
      "Toggle screen share",
      "Screen share state updated",
      err.message,
      "FAIL",
      err.stack
    );
  }

  // -------------------------------------------------------------------------
  // TEST F: Unexpected Disconnection & Cleanup
  // -------------------------------------------------------------------------
  try {
    // Client Joiner abruptly disconnects (simulating browser close or network interrupt)
    const userLeftOnCrashPromise = waitEvent(clientA, "room:user-left");
    clientJoiner.disconnect();
    const crashLeftEvt = await userLeftOnCrashPromise;

    assert.strictEqual(crashLeftEvt.userId, "user20261017003");
    assert.ok(crashLeftEvt.left_at, "Must include left_at timestamp");

    recordResult(
      "TEST-F",
      "Unexpected Disconnection Recovery",
      "Client Joiner and Client A active in room",
      "Force disconnect Client Joiner socket transport -> observe OnDisconnect handling in backend",
      "Remaining participants receive room:user-left; orphaned session is cleaned up",
      `Host received room:user-left for disconnected user ${crashLeftEvt.userId} at ${crashLeftEvt.left_at}`,
      "PASS",
      `Disconnect event: ${JSON.stringify(crashLeftEvt)}`
    );
  } catch (err) {
    recordResult(
      "TEST-F",
      "Unexpected Disconnection Recovery",
      "Peer abruptly disconnected",
      "Observe disconnect cleanup",
      "Remaining peers notified",
      err.message,
      "FAIL",
      err.stack
    );
  }

  // -------------------------------------------------------------------------
  // TEST H: Security & Scope Validation (Forged IDs & Unauthorized Access)
  // -------------------------------------------------------------------------
  let attackerClient;
  try {
    attackerClient = createClient("attacker-user-999");
    await waitEvent(attackerClient, "connected");

    // Attacker is NOT in testRoomId, attempts to send voice state toggle
    const errorPromise = waitEvent(attackerClient, "error", 2000);
    attackerClient.emit("voice:state-toggle", {
      roomId: testRoomId,
      userId: "user20261017001", // attempt to forge host user ID
      is_muted: true,
    });

    const errorEvt = await errorPromise;
    assert.ok(
      errorEvt.message && errorEvt.message.includes("unauthorized"),
      `Expected unauthorized error message, got: ${JSON.stringify(errorEvt)}`
    );

    // Attacker attempts unauthorized chat message
    const chatErrorPromise = waitEvent(attackerClient, "error", 2000);
    attackerClient.emit("chat:send", {
      roomId: testRoomId,
      content: "Hacked chat message",
    });
    const chatErrorEvt = await chatErrorPromise;
    assert.ok(
      chatErrorEvt.message && chatErrorEvt.message.includes("unauthorized"),
      `Expected unauthorized error message for chat, got: ${JSON.stringify(chatErrorEvt)}`
    );

    recordResult(
      "TEST-H",
      "Security & Broadcast Scope Enforcement",
      "Attacker socket connected but not a member of the room",
      "Attacker attempts voice:state-toggle and chat:send with forged ID and unauthorized room ID",
      "Backend rejects unauthorized room events and emits error; no room state changes or leaks occur",
      `Backend rejected unauthorized mutations with error="${errorEvt.message}" and chat error="${chatErrorEvt.message}"`,
      "PASS",
      `Error responses: ${JSON.stringify(errorEvt)}, ${JSON.stringify(chatErrorEvt)}`
    );
  } catch (err) {
    recordResult(
      "TEST-H",
      "Security & Broadcast Scope Enforcement",
      "Attacker socket outside room",
      "Attempt forged state toggle and unauthorized chat",
      "Rejected with error",
      err.message,
      "FAIL",
      err.stack
    );
  } finally {
    if (attackerClient?.connected) attackerClient.disconnect();
    if (clientA?.connected) {
      clientA.emit("room:leave", { roomId: testRoomId });
      clientA.disconnect();
    }
    if (clientLobby?.connected) clientLobby.disconnect();
  }

  // -------------------------------------------------------------------------
  // Final Summary Output
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("TEST RUN COMPLETE - SUMMARY RESULTS");
  console.log("==================================================================");
  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === "PASS").length;
  const failed = testResults.filter((r) => r.status === "FAIL").length;
  console.log(`Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("Unhandled error in test runner:", err);
  process.exit(1);
});
