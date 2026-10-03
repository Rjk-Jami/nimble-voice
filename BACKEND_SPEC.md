# NimbleVoice — Backend Architecture & API Specification

> **Specification Version**: 1.0.0  
> **Target Framework**: Node.js / Next.js API Routes (or Express/Fastify microservice) + Prisma ORM + PostgreSQL + Socket.io + NextAuth.js  
> **Frontend Integration**: Aligns with `@/lib/apiPaths.ts`, `@/schemas`, `@/enums`, and `@/types`.

---

## 📑 Table of Contents

1. [Architecture & System Flow](#1-architecture--system-flow)
2. [Prisma Database Schema (`schema.prisma`)](#2-prisma-database-schema-schemaprisma)
3. [REST API Endpoints Specification](#3-rest-api-endpoints-specification)
   - [Authentication & Users](#31-authentication--users)
   - [Rooms & Directory](#32-rooms--directory)
   - [Messages & In-Room Chat](#33-messages--in-room-chat)
   - [Topics & Conversation Starters](#34-topics--conversation-starters)
   - [Network Telemetry](#35-network-telemetry)
4. [Socket.io Signaling & Real-time Protocol](#4-socketio-signaling--real-time-protocol)
5. [WebRTC Mesh & ICE/TURN Configuration](#5-webrtc-mesh--iceturn-configuration)
6. [Security, Rate Limiting & Moderation](#6-security-rate-limiting--moderation)
7. [Implementation Blueprint](#7-implementation-blueprint)

---

## 1. Architecture & System Flow

NimbleVoice operates as a hybrid architecture:
- **REST / Server Actions**: Handles room catalog queries, persistence, room creation, authentication sessions, and user profiles.
- **WebSocket (Socket.io)**: Handles real-time signaling (SDP offer/answer, ICE candidates), room presence (peer join/leave), dynamic speaker amplitude broadcasting, and backchannel chat messages.
- **Peer-to-Peer Mesh (WebRTC)**: Delivers full-duplex Opus audio directly between browser participants without media routing through the server for low latency and zero media bandwidth costs.

```
┌──────────────────────┐         HTTP REST (SWR / Axios)         ┌──────────────────────┐
│                      │ ──────────────────────────────────────> │  Next.js API Routes  │
│  Client (Browser)    │ <────────────────────────────────────── │  + Prisma PostgreSQL │
│  - React 19          │                                         └──────────────────────┘
│  - Zustand Stores    │         WebSocket (Socket.io)           ┌──────────────────────┐
│  - WebRTC Peer Mesh  │ <=====================================> │   Signaling Server   │
│                      │                                         │  (Node / Socket.io)  │
└──────────────────────┘                                         └──────────────────────┘
      │          ▲
      │ WebRTC   │ Full-Duplex Opus Audio (Mesh)
      ▼          │
┌──────────────────────┐
│  Remote Peer Browser │
└──────────────────────┘
```

---

## 2. Prisma Database Schema (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  MODERATOR
  ADMIN
}

enum RoomStatus {
  WAITING
  LIVE
  FULL
  ENDED
}

enum MessageType {
  TEXT
  SYSTEM
  JOIN
  LEAVE
  REACTION
  IDIOM
}

model User {
  id               String        @id @default(cuid())
  email            String?       @unique
  name             String
  avatarUrl        String?
  location         String?
  nativeLanguage   String        @default("English")
  learningLanguage String        @default("Spanish")
  isVerified       Boolean       @default(false)
  isGuest          Boolean       @default(false)
  role             Role          @default(USER)
  karma            Int           @default(0)
  hoursSpoken      Float         @default(0.0)
  streak           Int           @default(1)
  lastActiveAt     DateTime      @default(now())
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  // Relationships
  cefrPortfolios   CefrPortfolio[]
  hostedRooms      Room[]        @relation("RoomHost")
  participations   Participant[]
  sentMessages     Message[]
  reportsFiled     Report[]      @relation("ReportReporter")
  reportsReceived  Report[]      @relation("ReportTarget")
}

model CefrPortfolio {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  language  String   // e.g. "English", "Spanish"
  level     String   // "A1", "A2", "B1", "B2", "C1", "C2", "NATIVE"
  updatedAt DateTime @updatedAt

  @@unique([userId, language])
}

model Room {
  id                  String        @id @default(cuid())
  title               String
  topic               String
  language            String
  cefrLevel           String        @default("ANY")
  levelLabel          String        @default("All Levels Welcome")
  maxSlots            Int           @default(5)
  currentSlots        Int           @default(1)
  tags                String[]      @default(["Casual & Life"])
  status              RoomStatus    @default(LIVE)
  isBeginnerFriendly  Boolean       @default(true)
  hasNativeSpeaker    Boolean       @default(false)
  hostId              String
  host                User          @relation("RoomHost", fields: [hostId], references: [id], onDelete: Cascade)
  startedAt           DateTime      @default(now())
  endedAt             DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  // Relationships
  participants        Participant[]
  messages            Message[]
  reports             Report[]

  @@index([status, language])
}

model Participant {
  id          String    @id @default(cuid())
  roomId      String
  room        Room      @relation(fields: [roomId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  isHost      Boolean   @default(false)
  joinedAt    DateTime  @default(now())
  leftAt      DateTime?

  @@unique([roomId, userId])
}

model Message {
  id            String      @id @default(cuid())
  roomId        String
  room          Room        @relation(fields: [roomId], references: [id], onDelete: Cascade)
  senderId      String
  sender        User        @relation(fields: [senderId], references: [id], onDelete: Cascade)
  content       String      @db.VarChar(500)
  type          MessageType @default(TEXT)
  isHighlighted Boolean     @default(false)
  reactions     String[]    @default([])
  createdAt     DateTime    @default(now())

  @@index([roomId, createdAt])
}

model TopicPrompt {
  id        String   @id @default(cuid())
  category  String   // e.g. "Daily Life & Icebreakers", "Tech, AI & Future"
  title     String
  level     String   @default("Any")
  tag       String   @default("General")
  createdAt DateTime @default(now())
}

model Report {
  id             String   @id @default(cuid())
  reporterId     String
  reporter       User     @relation("ReportReporter", fields: [reporterId], references: [id], onDelete: Cascade)
  reportedUserId String
  reportedUser   User     @relation("ReportTarget", fields: [reportedUserId], references: [id], onDelete: Cascade)
  roomId         String
  room           Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  reason         String   @db.VarChar(300)
  status         String   @default("PENDING") // PENDING, RESOLVED, DISMISSED
  createdAt      DateTime @default(now())
}
```

---

## 3. REST API Endpoints Specification

### 3.1. Authentication & Users

#### `GET /api/auth/session`
- **Description**: Returns current authenticated user session or guest profile.
- **Headers**: `Authorization: Bearer <token>` (or cookie session).
- **Response `200 OK`**:
```json
{
  "user": {
    "id": "usr_cld123",
    "name": "Alex Miller",
    "email": "alex@example.com",
    "avatarUrl": "https://images.unsplash.com/...",
    "location": "San Francisco, CA",
    "nativeLanguage": "English",
    "learningLanguage": "Spanish",
    "isVerified": true,
    "isGuest": false,
    "cefrPortfolio": {
      "English": "NATIVE",
      "Spanish": "B1",
      "Japanese": "A2"
    },
    "karma": 142,
    "hoursSpoken": 38.5,
    "streak": 18
  }
}
```

#### `POST /api/auth/guest`
- **Description**: Creates or restores zero-friction anonymous guest token.
- **Request Body**:
```json
{
  "name": "Guest Learner (Optional)"
}
```
- **Response `200 OK`**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "guest_987",
    "name": "Guest Learner",
    "isGuest": true,
    "isVerified": false,
    "nativeLanguage": "English",
    "learningLanguage": "Spanish",
    "karma": 0
  }
}
```

#### `PATCH /api/users/portfolio`
- **Description**: Updates user language proficiencies and settings.
- **Request Body**:
```json
{
  "nativeLanguage": "English",
  "learningLanguage": "Spanish",
  "cefrLevel": "B1",
  "location": "San Francisco, CA"
}
```
- **Response `200 OK`**: Updated user object.

---

### 3.2. Rooms & Directory

#### `GET /api/rooms`
- **Description**: Lists active voice rooms with filtering and pagination.
- **Query Parameters**:
  - `lang`: e.g. `English`, `Spanish`, `all` (default `all`)
  - `query`: Search string (title, tags, host name)
  - `filter`: `active` | `free-seats` | `beginner` | `native`
  - `page`: default `1`
  - `limit`: default `20`
- **Response `200 OK`**:
```json
{
  "rooms": [
    {
      "id": "room_123",
      "title": "Casual Chat & Coffee: Daily life & cultural exchange",
      "topic": "Daily life & cultural exchange",
      "language": "English",
      "flag": "🇬🇧",
      "cefrLevel": "B1",
      "levelLabel": "Intermediate B1",
      "maxSlots": 6,
      "currentSlots": 4,
      "tags": ["Casual & Life", "Culture"],
      "status": "LIVE",
      "startedAt": "2026-10-04T00:30:00.000Z",
      "activeSinceMinutes": 38,
      "hasFreeSeats": true,
      "isBeginnerFriendly": true,
      "hasNativeSpeaker": true,
      "host": {
        "id": "usr_host1",
        "name": "Alex Miller",
        "avatarUrl": "https://..."
      },
      "participants": [
        {
          "id": "usr_host1",
          "name": "Alex Miller",
          "avatarUrl": "https://...",
          "location": "San Francisco, CA",
          "nativeLanguage": "English",
          "learningLanguage": "Spanish",
          "isHost": true,
          "isSpeaking": false,
          "isMuted": false,
          "handRaised": false
        }
      ]
    }
  ],
  "total": 68
}
```

#### `POST /api/rooms`
- **Description**: Creates a new room and sets creator as host.
- **Request Body** (Validated by `createRoomSchema`):
```json
{
  "title": "Japanese Anime & Everyday Slang",
  "language": "Japanese",
  "cefrLevel": "B2",
  "maxSlots": 5,
  "topicTag": "Pop Culture & Movies",
  "isBeginnerFriendly": true
}
```
- **Response `201 Created`**: Returns newly created `VoiceRoom` object.

#### `GET /api/rooms/:id`
- **Description**: Returns detailed room state, participant list, and recent chat history.

#### `POST /api/rooms/:id/join`
- **Description**: Verifies slot availability, registers participant, and returns WebRTC signaling token.
- **Response `200 OK`**:
```json
{
  "success": true,
  "roomId": "room_123",
  "peerToken": "sig_tok_xyz"
}
```
- **Error `409 Conflict`**: Room is full (`currentSlots >= maxSlots`).

#### `POST /api/rooms/:id/leave`
- **Description**: Marks participant as left; if host leaves and room is empty, marks room as `ENDED`.

---

### 3.3. Messages & In-Room Chat

#### `GET /api/rooms/:id/messages`
- **Description**: Retrieves recent messages for room backchannel.
- **Query**: `limit=50&before=<messageId>`
- **Response `200 OK`**: Array of `ChatMessage` objects.

#### `POST /api/rooms/:id/messages`
- **Description**: Persists backchannel chat message (also broadcasted via Socket.io).
- **Request Body**:
```json
{
  "content": "A blessing in disguise 🎯",
  "type": "IDIOM"
}
```
- **Response `201 Created`**: Stored `ChatMessage` record.

---

### 3.4. Topics & Conversation Starters

#### `GET /api/topics/prompts`
- **Description**: Returns prompt decks organized by category.
- **Response `200 OK`**:
```json
[
  {
    "category": "Daily Life & Icebreakers",
    "icon": "coffee",
    "prompts": [
      { "title": "What is the strangest food you have ever tasted?", "level": "Any", "tag": "Food" },
      { "title": "If you could live in any city for a year, where?", "level": "A2-B1", "tag": "Travel" }
    ]
  }
]
```

---

### 3.5. Network Telemetry

#### `GET /api/stats/network`
- **Description**: Returns platform-wide real-time network counters.
- **Response `200 OK`**:
```json
{
  "onlineCount": 1429,
  "activeRoomsCount": 68,
  "liveLanguagesCount": 14
}
```

---

## 4. Socket.io Signaling & Real-time Protocol

The signaling server coordinates peer discovery, SDP exchanges, and presence.

### Connection Handshake
```ts
const socket = io("wss://api.nimblevoice.com", {
  auth: {
    token: "jwt_or_guest_token",
    userId: "usr_123"
  }
});
```

### Event Contracts Table

| Event Name | Direction | Payload | Description |
| :--- | :---: | :--- | :--- |
| `room:join` | Client ➔ Server | `{ roomId: string }` | Client joins signaling room |
| `room:user-joined` | Server ➔ Client | `{ userId, socketId, user: Participant }` | Informs peers to initiate WebRTC offer |
| `webrtc:offer` | Client ⇄ Server | `{ targetSocketId, sdp: RTCSessionDescriptionInit }` | Relays SDP offer to target peer |
| `webrtc:answer` | Client ⇄ Server | `{ targetSocketId, sdp: RTCSessionDescriptionInit }` | Relays SDP answer to caller peer |
| `webrtc:ice-candidate` | Client ⇄ Server | `{ targetSocketId, candidate: RTCIceCandidateInit }` | Exchanges trickle ICE candidates |
| `voice:speaking` | Client ➔ Server | `{ roomId, isSpeaking: boolean, level: number }` | Broadcasts speaking halo & volume |
| `voice:speaking-changed` | Server ➔ Client | `{ userId, isSpeaking, level }` | Updates speaking amplitude map |
| `voice:state-toggle` | Client ➔ Server | `{ roomId, isMuted?, isDeafened?, handRaised? }` | Toggles tactical voice status |
| `voice:state-updated` | Server ➔ Client | `{ userId, isMuted, isDeafened, handRaised }` | Syncs peer badges across all clients |
| `chat:send` | Client ➔ Server | `{ roomId, content, type: MessageType }` | In-room text or reaction emission |
| `chat:new-message` | Server ➔ Client | `ChatMessage` | Broadcasts message to all room peers |
| `room:user-left` | Server ➔ Client | `{ userId, socketId }` | Triggers peer connection close & cleanup |
| `host:kick-user` | Client ➔ Server | `{ roomId, targetUserId }` | Host removes toxic participant |
| `room:kicked` | Server ➔ Client | `{ reason: string }` | Forces target peer to disconnect & leave |

---

## 5. WebRTC Mesh & ICE/TURN Configuration

### WebRTC Connection Matrix
In a mesh topology, each participant maintains an `RTCPeerConnection` with every other participant in the room:
$$\text{Connections per room} = \frac{N(N - 1)}{2} \quad (\text{where } N \le 8)$$

### ICE Servers Configuration
```ts
export const WEBRTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: [
        "turn:turn.nimblevoice.com:3478?transport=udp",
        "turn:turn.nimblevoice.com:3478?transport=tcp",
      ],
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    },
  ],
  iceCandidatePoolSize: 4,
};
```

### Opus Audio Codec Parameters
Enforce optimal voice parameters in the SDP:
```
a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=64000;stereo=1
```

---

## 6. Security, Rate Limiting & Moderation

1. **Room Capacity Limit**: Server strictly rejects `room:join` if participant count meets `maxSlots`.
2. **Rate Limiting**:
   - `POST /api/rooms`: Max 3 rooms created per user per 10 minutes.
   - `chat:send`: Max 5 messages per 5 seconds per socket to prevent chat flooding.
3. **Hardware / IP Ban**: When moderator triggers a ban, the offending IP / user ID is added to a Redis revocation set, immediately terminating their Socket.io connection.

---

## 7. Implementation Blueprint

To generate this backend:
1. **Initialize Database**:
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   # Paste section 2 into prisma/schema.prisma
   npx prisma migrate dev --name init
   ```
2. **Install Backend Dependencies**:
   ```bash
   npm install socket.io next-auth @auth/prisma-adapter jsonwebtoken bcryptjs
   ```
3. **Route Files to Create**:
   - `app/api/auth/[...nextauth]/route.ts` (NextAuth session)
   - `app/api/rooms/route.ts` (GET / POST rooms)
   - `app/api/rooms/[roomId]/route.ts` (GET room detail)
   - `app/api/rooms/[roomId]/messages/route.ts` (GET / POST chat)
   - `app/api/users/portfolio/route.ts` (PATCH user portfolio)
   - `server/socket-server.ts` (Socket.io standalone or Next.js custom server)
