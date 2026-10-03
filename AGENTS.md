<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Architecture & Technology Stack Standards

All features, refactors, and components in **NimbleVoice** must adhere strictly to the following architectural foundation:

- **State Management**: **Zustand** (all client-side state, room session state, audio hardware calibration, modal visibility, and user preferences)
- **Data Fetching**: **SWR + Server Actions** (for cached client requests, optimistic updates, and server mutations)
- **Forms & Validation**: **React Hook Form + Zod v4** (type-safe form schemas, room creation, user profile settings, and validation)
- **Real-time Voice**: **WebRTC** (`RTCPeerConnection` / `simple-peer`) with mesh topology, full-duplex Opus audio, and dynamic audio visualizer integration
- **Real-time Signaling & Messaging**: **Socket.io** (peer discovery, room presence, ICE candidates exchange, and in-room backchannel chat)
- **Icons**: **Lucide React** (consistent, crisp iconography across all UI components)
- **Animations**: **Framer Motion** (smooth room card transitions, modal backdrops, drawer expansions, and tactical audio indicator pulses)
- **Authentication**: **NextAuth.js (Auth.js)** (supporting Email Magic Link + Google OAuth + Instant Anonymous Guest mode for zero-friction entry)
- **Database & ORM**: **Prisma + PostgreSQL** (schema models for Users, Rooms, Languages, Reports, and Conversation Prompts)
- **UI Primitives**: **Radix UI + Headless UI** (accessible dialogs, dropdowns, popovers, tooltips, and sliders paired with Tailwind CSS)
