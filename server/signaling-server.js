/**
 * NimbleVoice — Standalone Socket.io Signaling Server
 * 
 * Provides real-time signaling for WebRTC peer-to-peer mesh audio:
 * - Room presence management (join, leave, disconnect)
 * - Dynamic active rooms catalog & live slot tracking
 * - Real-time telemetry (live learners, active voice rooms, active languages)
 * - WebRTC SDP offer / answer relay
 * - WebRTC trickle ICE candidate exchange
 * - Audio state synchronization (isMuted, isDeafened, handRaised)
 * - Dynamic speaking activity & volume amplitude broadcasting
 * - In-room backchannel chat and emoji reaction synchronization
 */

const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.SIGNALING_PORT || 3002;

// Set: all active connected sockets (lobby browsers + active room callers)
const connectedSocketIds = new Set();
// Map: socketId -> { socketId, userId, roomId, user }
const connectedClients = new Map();
// Map: roomId -> Set<socketId>
const roomParticipants = new Map();
// Map: roomId -> VoiceRoom
const activeRooms = new Map();

// Seed initial clean, open community rooms with 0 slots filled
const INITIAL_DYNAMIC_ROOMS = [
  {
    id: "room-english-lounge",
    title: "Global English Lounge: Casual chat, culture & daily life",
    topic: "Casual chat, culture & daily life",
    language: "English",
    flag: "🇬🇧",
    cefrLevel: "B1",
    levelLabel: "Intermediate B1",
    maxSlots: 6,
    currentSlots: 0,
    tags: ["Casual & Life", "Culture"],
    status: "LIVE",
    startedAt: new Date().toISOString(),
    activeSinceMinutes: 0,
    hasFreeSeats: true,
    isBeginnerFriendly: true,
    hasNativeSpeaker: false,
    isLive: true,
    host: {
      id: "host-community",
      name: "Nimble Community Host",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      location: "Global",
      nativeLanguage: "English",
      learningLanguage: "Spanish",
      isVerified: true,
      karma: 500,
      hoursSpoken: 120,
      streak: 45,
    },
    participants: [],
    messages: [],
  },
  {
    id: "room-spanish-corner",
    title: "Spanish Practice Corner: Saludos, viajes y vida cotidiana",
    topic: "Saludos, viajes y vida cotidiana",
    language: "Spanish",
    flag: "🇪🇸",
    cefrLevel: "A2",
    levelLabel: "Beginner A2",
    maxSlots: 5,
    currentSlots: 0,
    tags: ["Grammar & Vocab", "Beginners"],
    status: "LIVE",
    startedAt: new Date().toISOString(),
    activeSinceMinutes: 0,
    hasFreeSeats: true,
    isBeginnerFriendly: true,
    hasNativeSpeaker: false,
    isLive: true,
    host: {
      id: "host-elena",
      name: "Elena Moderadora",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      location: "Madrid, ES",
      nativeLanguage: "Spanish",
      learningLanguage: "English",
      isVerified: true,
      karma: 420,
      hoursSpoken: 95,
      streak: 32,
    },
    participants: [],
    messages: [],
  },
];

INITIAL_DYNAMIC_ROOMS.forEach((r) => activeRooms.set(r.id, r));

function getLiveStats() {
  const uniqueLanguages = new Set();
  activeRooms.forEach((r) => {
    if (r.language) uniqueLanguages.add(r.language);
  });
  // Real count of all connected socket learners
  const count = typeof io !== "undefined" && io.engine ? io.engine.clientsCount : connectedSocketIds.size;
  return {
    onlineCount: Math.max(1, count),
    activeRoomsCount: activeRooms.size,
    liveLanguagesCount: Math.max(1, uniqueLanguages.size),
  };
}

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "nimble-voice-signaling",
        stats: getLiveStats(),
        activeRooms: activeRooms.size,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

io.on("connection", (socket) => {
  connectedSocketIds.add(socket.id);
  console.log(`[Signaling] Peer connected: ${socket.id} (Online learners: ${connectedSocketIds.size})`);

  // Deliver current active rooms & live telemetry to newly connected socket
  socket.emit("stats:updated", getLiveStats());
  socket.emit("rooms:updated", Array.from(activeRooms.values()));

  // Broadcast updated live statistics globally to all connected clients
  io.emit("stats:updated", getLiveStats());

  // 1. Dynamic Room Creation
  socket.on("room:create", ({ room }) => {
    if (!room || !room.id) return;
    console.log(`[Signaling] New room created: ${room.id} (${room.title})`);
    activeRooms.set(room.id, room);
    io.emit("rooms:updated", Array.from(activeRooms.values()));
    io.emit("stats:updated", getLiveStats());
  });

  // Query rooms on demand
  socket.on("rooms:get", (callback) => {
    if (typeof callback === "function") {
      callback(Array.from(activeRooms.values()));
    }
  });

  // Query stats on demand
  socket.on("stats:get", (callback) => {
    if (typeof callback === "function") {
      callback(getLiveStats());
    }
  });

  // 2. Peer Joins Room
  socket.on("room:join", ({ roomId, user }) => {
    if (!roomId) return;

    // Leave any previous room
    const prevData = connectedClients.get(socket.id);
    if (prevData?.roomId) {
      leaveRoomInternal(socket);
    }

    const roomKey = `room:${roomId}`;
    socket.join(roomKey);

    const clientInfo = {
      socketId: socket.id,
      userId: user?.id || `anon-${socket.id.slice(0, 6)}`,
      roomId,
      user: user || { id: socket.id, name: `Learner ${socket.id.slice(0, 4)}` },
    };

    connectedClients.set(socket.id, clientInfo);

    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Set());
    }

    // Get list of existing peers in this room with full voiceState
    const room = activeRooms.get(roomId);
    const existingPeers = [];
    roomParticipants.get(roomId).forEach((peerSocketId) => {
      if (peerSocketId !== socket.id) {
        const peerInfo = connectedClients.get(peerSocketId);
        if (peerInfo) {
          const pObj = room?.participants.find((p) => p.id === peerInfo.userId);
          existingPeers.push({
            ...peerInfo,
            voiceState: {
              isMuted: pObj?.isMuted ?? false,
              isDeafened: pObj?.isDeafened ?? false,
              handRaised: pObj?.handRaised ?? false,
              isScreenSharing: pObj?.isScreenSharing ?? false,
            },
          });
        }
      }
    });

    // Add current peer to room set
    roomParticipants.get(roomId).add(socket.id);

    // Update room participant slot count in active directory
    if (room) {
      room.currentSlots = roomParticipants.get(roomId).size;
      room.hasFreeSeats = room.currentSlots < room.maxSlots;

      // Add to room's participants list if not already present
      const participantObj = {
        ...(clientInfo.user || {}),
        id: clientInfo.userId,
        isHost: clientInfo.userId === room.host?.id,
        isSpeaking: false,
        isMuted: false,
        isDeafened: false,
        handRaised: false,
        isScreenSharing: false,
      };

      if (!room.participants.some((p) => p.id === clientInfo.userId)) {
        room.participants.push(participantObj);
      }
      io.emit("rooms:updated", Array.from(activeRooms.values()));
    }

    console.log(
      `[Signaling] ${clientInfo.userId} joined room ${roomId}. Active peers: ${roomParticipants.get(roomId).size}`
    );

    // Inform the newly joined peer about existing peers in the room
    socket.emit("room:existing-peers", {
      roomId,
      peers: existingPeers,
      screenSharer: room?.screenSharer || null,
    });

    // Broadcast to existing room peers that a new user joined
    socket.to(roomKey).emit("room:user-joined", {
      socketId: socket.id,
      userId: clientInfo.userId,
      user: clientInfo.user,
    });

    io.emit("stats:updated", getLiveStats());
  });

  // 3. WebRTC SDP Offer Relay
  socket.on("webrtc:offer", ({ targetSocketId, sdp, user }) => {
    if (!targetSocketId || !sdp) return;
    const sender = connectedClients.get(socket.id);
    io.to(targetSocketId).emit("webrtc:offer", {
      senderSocketId: socket.id,
      userId: sender?.userId,
      sdp,
      user: user || sender?.user,
    });
  });

  // 4. WebRTC SDP Answer Relay
  socket.on("webrtc:answer", ({ targetSocketId, sdp }) => {
    if (!targetSocketId || !sdp) return;
    io.to(targetSocketId).emit("webrtc:answer", {
      senderSocketId: socket.id,
      sdp,
    });
  });

  // 5. WebRTC Trickle ICE Candidate Relay
  socket.on("webrtc:ice-candidate", ({ targetSocketId, candidate }) => {
    if (!targetSocketId || !candidate) return;
    io.to(targetSocketId).emit("webrtc:ice-candidate", {
      senderSocketId: socket.id,
      candidate,
    });
  });

  // 6. Dynamic Speaking Halo & Volume Broadcast
  socket.on("voice:speaking", ({ roomId, isSpeaking, level }) => {
    const client = connectedClients.get(socket.id);
    if (!client || !roomId) return;

    socket.to(`room:${roomId}`).emit("voice:speaking-changed", {
      socketId: socket.id,
      userId: client.userId,
      isSpeaking: Boolean(isSpeaking),
      level: typeof level === "number" ? level : 0,
    });
  });

  // 7. Tactical Voice State Updates (Mute, Deafen, Hand Raised)
  socket.on("voice:state-toggle", ({ roomId, isMuted, isDeafened, handRaised }) => {
    const client = connectedClients.get(socket.id);
    if (!client || !roomId) return;

    // Update in-memory room participant voice state
    const room = activeRooms.get(roomId);
    if (room && Array.isArray(room.participants)) {
      const p = room.participants.find((p) => p.id === client.userId);
      if (p) {
        if (typeof isMuted === "boolean") p.isMuted = isMuted;
        if (typeof isDeafened === "boolean") p.isDeafened = isDeafened;
        if (typeof handRaised === "boolean") p.handRaised = handRaised;
      }
    }

    socket.to(`room:${roomId}`).emit("voice:state-updated", {
      socketId: socket.id,
      userId: client.userId,
      isMuted,
      isDeafened,
      handRaised,
    });
  });

  // 8. Screen Sharing State
  socket.on("room:screen-share", ({ roomId, isSharing }) => {
    const client = connectedClients.get(socket.id);
    if (!client || !roomId) return;

    const room = activeRooms.get(roomId);
    if (room) {
      room.screenSharer = isSharing ? client.userId : null;
      if (Array.isArray(room.participants)) {
        const p = room.participants.find((p) => p.id === client.userId);
        if (p) p.isScreenSharing = Boolean(isSharing);
      }
    }

    socket.to(`room:${roomId}`).emit("room:screen-share-changed", {
      userId: client.userId,
      socketId: socket.id,
      isSharing: Boolean(isSharing),
    });
  });

  // 9. In-Room Backchannel Chat Message Relay
  socket.on("chat:send", ({ roomId, message }) => {
    if (!roomId || !message) return;

    // Cache message in room record
    const room = activeRooms.get(roomId);
    if (room) {
      if (!room.messages) room.messages = [];
      room.messages.push(message);
      if (room.messages.length > 100) room.messages.shift();
    }

    io.to(`room:${roomId}`).emit("chat:new-message", message);
  });

  // 10. Message Reactions
  socket.on("chat:react", ({ roomId, messageId, emoji, userId }) => {
    if (!roomId || !messageId || !emoji || !userId) return;

    const room = activeRooms.get(roomId);
    let updatedReactions = {};

    if (room && Array.isArray(room.messages)) {
      const msg = room.messages.find((m) => m.id === messageId);
      if (msg) {
        if (!msg.reactions) msg.reactions = {};
        const currentList = msg.reactions[emoji] || [];
        const alreadyReacted = currentList.includes(userId);

        // One reaction at a time per user: remove user from any other emoji on this message
        Object.keys(msg.reactions).forEach((e) => {
          msg.reactions[e] = msg.reactions[e].filter((id) => id !== userId);
          if (msg.reactions[e].length === 0) delete msg.reactions[e];
        });

        // Toggle: if they clicked a different emoji, add it; if clicked the same, it remains removed
        if (!alreadyReacted) {
          if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
          msg.reactions[emoji].push(userId);
        }

        updatedReactions = { ...msg.reactions };
      }
    }

    io.to(`room:${roomId}`).emit("chat:reaction-updated", {
      messageId,
      reactions: updatedReactions,
      userId,
    });
  });

  // 11. Live Floating Reaction Relay
  socket.on("reaction:send", ({ roomId, reaction }) => {
    if (!roomId || !reaction) return;
    io.to(`room:${roomId}`).emit("reaction:new-reaction", reaction);
  });

  // 10. Latency Ping-Pong Check
  socket.on("mesh:ping", (timestamp, callback) => {
    if (typeof callback === "function") {
      callback(timestamp);
    }
  });

  // 11. Room Leave / Disconnect
  const leaveRoomInternal = (currSocket) => {
    const client = connectedClients.get(currSocket.id);
    if (!client) return;

    const { roomId, userId } = client;
    if (roomId && roomParticipants.has(roomId)) {
      const roomSet = roomParticipants.get(roomId);
      roomSet.delete(currSocket.id);

      currSocket.to(`room:${roomId}`).emit("room:user-left", {
        socketId: currSocket.id,
        userId,
      });

      currSocket.leave(`room:${roomId}`);
      console.log(`[Signaling] ${userId} (${currSocket.id}) left room ${roomId}`);

      // Update room in catalog
      const room = activeRooms.get(roomId);
      if (room) {
        room.currentSlots = roomSet.size;
        room.hasFreeSeats = room.currentSlots < room.maxSlots;

        // Only remove participant from room if no other socket from same user is present
        const remainingUserSockets = Array.from(roomSet).filter(
          (sid) => connectedClients.get(sid)?.userId === userId
        );
        if (remainingUserSockets.length === 0) {
          room.participants = room.participants.filter((p) => p.id !== userId);
        }
      }
    }

    connectedClients.delete(currSocket.id);
    io.emit("rooms:updated", Array.from(activeRooms.values()));
    io.emit("stats:updated", getLiveStats());
  };

  socket.on("room:leave", () => {
    leaveRoomInternal(socket);
  });

  socket.on("disconnect", (reason) => {
    connectedSocketIds.delete(socket.id);
    console.log(`[Signaling] Peer disconnected: ${socket.id} (Online learners: ${connectedSocketIds.size})`);
    leaveRoomInternal(socket);
    io.emit("stats:updated", getLiveStats());
  });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🎙️  NimbleVoice WebRTC Signaling Server Active`);
  console.log(`📡  Listening on http://localhost:${PORT}`);
  console.log(`⚡  Real-Time Room Directory & Mesh Signaling Ready`);
  console.log(`=================================================\n`);
});
