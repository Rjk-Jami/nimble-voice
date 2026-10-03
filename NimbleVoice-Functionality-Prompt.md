# NimbleVoice — Complete Functionality Implementation Prompt

> **Use this prompt with Claude, Cursor, Antigravity, or any advanced AI coding assistant.**  
> Goal: Complete all missing backend, real-time, and state-management functionality for the already-designed NimbleVoice UI.

---

```text
Act as a Principal Full-Stack Engineer specializing in real-time voice platforms (WebRTC mesh + Socket.io).

I already have a fully designed and visually complete UI for **NimbleVoice** (a Free4Talk-inspired language practice platform). The UI is built with Next.js 16.3.8 (App Router), React 19, Tailwind CSS v4, Framer Motion, Lucide + Material Symbols, and a custom Stitch dark design system.

Your job is to **complete all missing functionality** while strictly following the architecture and coding standards below. Do not redesign the UI. Only implement the logic, state, types, hooks, real-time systems, and data layer.

### Current Design Tokens (must be used everywhere)

```css
--bg-canvas: #0e141b;
--surface-container-lowest: #090f15;
--surface-container-low: #161c23;
--surface-container: #1a2027;
--surface-container-high: #242a32;
--surface-container-highest: #2f353d;
--primary: #4be277;
--primary-container: #22c55e;
--on-primary: #003915;
--on-surface: #dde3ed;
--on-surface-variant: #94a3b8;
--outline-variant: #2a3340;
--error: #ef4444;
```

### Strict Technology Requirements

| Area                    | Technology                                              |
|-------------------------|---------------------------------------------------------|
| Framework               | Next.js 16.3.8 App Router + React 19                    |
| State                   | **Separated Zustand stores** (never one god store)      |
| Forms                   | React Hook Form + **Zod v4**                            |
| Data Fetching           | **SWR + Axios instance**                                |
| UI Components           | **shadcn/ui** (fully customized to the design tokens)   |
| Real-time Voice         | Native WebRTC (`RTCPeerConnection`) mesh                |
| Signaling & Chat        | Socket.io                                               |
| Database                | Prisma + PostgreSQL                                     |
| Auth                    | NextAuth.js (Auth.js) – Google + Magic Link + Guest     |
| Icons                   | Lucide React + Material Symbols                         |
| Animations              | Framer Motion (already used in UI)                      |

---

## 1. Folder Structure (must follow exactly)

```
src/
├── app/
│   ├── (auth)/
│   ├── (main)/
│   │   ├── page.tsx
│   │   └── room/[roomId]/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── rooms/
│   │   ├── messages/
│   │   └── users/
│   └── layout.tsx
├── components/               # existing UI components (do not rewrite visuals)
├── lib/
│   ├── axios.ts              # Axios instance + interceptors
│   ├── socket.ts             # Socket.io client singleton
│   ├── webrtc.ts             # Peer connection helpers
│   ├── prisma.ts
│   ├── auth.ts
│   └── utils.ts
├── stores/                   # SEPARATED Zustand stores
│   ├── useAuthStore.ts
│   ├── useLobbyStore.ts
│   ├── useRoomStore.ts
│   ├── useVoiceStore.ts
│   ├── useMessengerStore.ts
│   ├── useUIStore.ts
│   ├── useDeviceStore.ts
│   └── useSettingsStore.ts
├── hooks/
│   ├── useRooms.ts           # SWR
│   ├── useRoom.ts
│   ├── useVoiceRoom.ts       # WebRTC + Socket orchestration
│   ├── useMessenger.ts
│   ├── useSocket.ts
│   ├── useDevices.ts
│   ├── useSpeakingDetection.ts
│   └── useAuth.ts
├── types/
│   ├── index.ts
│   ├── room.ts
│   ├── user.ts
│   ├── message.ts
│   └── webrtc.ts
├── enums/
│   ├── language.enum.ts
│   ├── cefr.enum.ts
│   ├── room-status.enum.ts
│   ├── audio-quality.enum.ts
│   └── message-type.enum.ts
├── schemas/                  # Zod v4
│   ├── room.schema.ts
│   ├── user.schema.ts
│   └── message.schema.ts
├── server/
│   └── socket-server.ts      # Standalone Socket.io server
└── components/ui/            # shadcn components customized to design tokens
```

---

## 2. Types & Enums (must be complete and exported)

Create strongly typed enums and interfaces:

```ts
// enums
export enum Language { ... }          // English, Spanish, French... + flags
export enum CEFRLevel { A1, A2, B1, B2, C1, C2, NATIVE, ALL }
export enum RoomStatus { WAITING, LIVE, FULL, ENDED }
export enum AudioQuality { DATA_SAVER, HIGH_FIDELITY, STUDIO }
export enum MessageType { TEXT, SYSTEM, JOIN, LEAVE, REACTION, IDIOM }
export enum VoiceMode { VAD, PUSH_TO_TALK }
```

```ts
// Core types
interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  isVerified: boolean;
  cefrPortfolio: Record<string, CEFRLevel>;
  karma: number;
  hoursSpoken: number;
  streak: number;
  // ...
}

interface Participant extends User {
  isHost: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  handRaised: boolean;
  stream?: MediaStream;
  peerId?: string;
}

interface VoiceRoom {
  id: string;
  title: string;
  topic: string;
  language: Language;
  cefrLevel: CEFRLevel;
  maxSlots: number;
  currentSlots: number;
  host: User;
  participants: Participant[];
  tags: string[];
  status: RoomStatus;
  startedAt: string;
  duration?: number;
}

interface ChatMessage {
  id: string;
  roomId: string;
  sender: User;
  content: string;
  type: MessageType;
  reactions?: string[];
  createdAt: string;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}
```

---

## 3. Separated Zustand Stores (mandatory)

Never put everything in one store. Create focused stores:

- `useAuthStore` → user, isAuthenticated, login/logout, guest mode
- `useLobbyStore` → rooms list, filters, search query, language counts, live stats
- `useRoomStore` → currentRoom, isJoining, isHost
- `useVoiceStore` → isMuted, isDeafened, isScreenSharing, handRaised, localStream, peers Map, networkLatency, speakingMap
- `useMessengerStore` → messages, unreadCount, typingUsers
- `useUIStore` → which modals are open (create, profile, settings, audio-calibration, topics…)
- `useDeviceStore` → audioInputId, audioOutputId, devices list, permission status
- `useSettingsStore` → voiceMode (VAD/PTT), audioQuality, join/leave sounds, noiseSuppression, echoCancellation

All stores must be typed and use `create` from Zustand. Persist only auth + settings.

---

## 4. shadcn/ui Customization

- Install and configure shadcn/ui.
- Override the default theme in `components.json` and `globals.css` so every shadcn component uses the exact NimbleVoice design tokens above.
- Primary color must be `#22c55e` / `#4be277`.
- Backgrounds must use the surface-container elevation scale.
- Create/override at least: Button, Input, Dialog, Select, Slider, Badge, Avatar, Tooltip, Switch, Tabs, DropdownMenu, ScrollArea, Toast.

---

## 5. Axios + SWR Configuration

```ts
// lib/axios.ts
- Create a typed Axios instance
- Base URL from env
- Request interceptor: attach auth token
- Response interceptor: handle 401 → logout, global error toast

// SWR global config
- Use the Axios instance as fetcher
- revalidateOnFocus, dedupingInterval, errorRetryCount
- Optimistic UI helpers for room join / create / leave
```

---

## 6. Core Functionality to Implement (in order)

### Phase A – Foundation
1. Types + Enums
2. Separated Zustand stores
3. Zod v4 schemas
4. Axios instance + SWR setup
5. Customized shadcn components matching the design system
6. Prisma schema (User, Room, Participant, Message, Report)

### Phase B – Lobby & Room Management
1. `useRooms` + `useRoom` hooks (SWR)
2. Real filtering, search, language counts
3. Create Room (React Hook Form + Zod) → optimistic add to lobby + navigate as host
4. Join / Leave room with capacity checks

### Phase C – Real-time Voice (Highest Priority)
1. Socket.io client + server (`join-room`, `leave-room`, `offer`, `answer`, `ice-candidate`, `user-joined`, `user-left`, `speaking`, `hand-raised`)
2. `useVoiceRoom` hook that:
   - Gets user media
   - Creates mesh of RTCPeerConnections
   - Handles offer/answer/ICE
   - Manages local + remote streams
   - Detects speaking (AudioContext analyser)
   - Syncs mute / deafen / hand-raised state
3. Device selection + permission handling
4. Audio quality presets (32 / 64 / 96 kbps Opus)

### Phase D – Messenger
1. Real-time text chat via Socket.io
2. System messages (join/leave)
3. Emoji reactions
4. Idiom / vocabulary callout cards

### Phase E – Auth & Profile
1. NextAuth (Google + Magic Link + Anonymous Guest)
2. Profile modal data (CEFR portfolio, hours, streak, karma)
3. Persistent guest identity

### Phase F – Polish
1. Audio calibration modal (real mic meter + test tone)
2. Network latency display
3. Proper cleanup on leave / unmount
4. Error boundaries + toast notifications
5. Optimistic UI everywhere

---

## Coding Rules

- Use Server Components by default. Mark Client Components only when necessary.
- All hooks and stores must be fully typed.
- Never use `any`.
- Prefer early returns and clean separation of concerns.
- Every WebRTC and Socket event must have proper cleanup.
- Write production-ready, readable, well-commented code.
- After implementing each phase, show me the key files and wait for confirmation before moving to the next phase.

---

**Start with Phase A** (Types, Enums, Separated Stores, Zod schemas, Axios + SWR, shadcn customization, Prisma schema).
```

---

## Why This Prompt Works

| Requirement                        | Covered |
|------------------------------------|---------|
| Separated stores                   | ✅ 8 focused Zustand stores |
| Hooks                              | ✅ Dedicated hooks for rooms, voice, messenger, devices, speaking detection |
| Types                              | ✅ Full TypeScript interfaces |
| Enums                              | ✅ Language, CEFR, RoomStatus, AudioQuality, MessageType, VoiceMode |
| shadcn/ui                          | ✅ Required + full theme customization to Stitch tokens |
| Customized shadcn color scheme     | ✅ Exact design tokens mapped |
| SWR + Axios instance               | ✅ Typed Axios + SWR fetcher + interceptors |
| WebRTC mesh                        | ✅ Highest priority phase |
| Socket.io signaling + chat         | ✅ Full event list |
| Prisma + Auth                      | ✅ Included |
| Phased delivery                    | ✅ You stay in control |

---

**How to use**

1. Copy everything inside the large code block (the actual prompt).
2. Paste it into Claude / Cursor / Antigravity.
3. Let it start with **Phase A**.
4. Review → confirm → move to the next phase.
```
