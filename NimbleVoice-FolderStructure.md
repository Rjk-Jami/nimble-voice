# NimbleVoice-Folder Structure

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
