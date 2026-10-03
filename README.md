# NimbleVoice — Free4Talk Clone Platform

> **Real-time multilingual voice conversation platform for language learners worldwide.**  
> Connect with native speakers, practice conversational fluency in zero-friction audio mesh rooms, and access interactive learning aids directly in the browser.

---

## 🌟 Executive Overview

**NimbleVoice** is a modern, high-performance web platform inspired by Free4Talk. It bridges language learners globally through peer-to-peer audio rooms, real-time presence, and in-call interactive tools without requiring downloads, app installations, or paid subscriptions.

### Key Value Propositions
- **Zero-Friction Access**: Enter rooms and start speaking in one click.
- **Audio Mesh Architecture**: Low-latency, full-duplex Opus audio via WebRTC.
- **Tactile Learning Tools**: CEFR language badges, active speaker detection with animated soundbars, in-call backchannel text chat, and conversation icebreakers.
- **Calm, High-End Dark Aesthetic**: Built on the Stitch Design System optimized for low eye fatigue during extended speaking sessions.

---

## 🏗️ Technology Stack & Standards

All modules and components in NimbleVoice strictly conform to the following architectural foundation:

| Domain | Technology / Library | Role & Implementation |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.3.8 (App Router)** + **React 19** | Server/Client components, Turbopack, route optimization |
| **State Management** | **Zustand** (`lib/store.ts`) | Centralized client-side state: room sessions, tactical audio controls, modal visibility, filters |
| **Forms & Validation** | **React Hook Form + Zod v4** (`lib/schemas.ts`) | Type-safe form validation for room creation, user profile settings, and inputs |
| **Data Fetching** | **SWR + Server Actions** | Optimistic UI updates, caching, revalidation, and mutation pipelines |
| **Real-time Voice** | **WebRTC** (`RTCPeerConnection` / `simple-peer`) | Mesh topology, full-duplex Opus audio (32–96 kbps), dynamic frequency visualizers |
| **Signaling & Chat** | **Socket.io** (`socket.io-client`) | Peer discovery, ICE candidate exchange, room presence, and live backchannel text |
| **Styling & CSS** | **Tailwind CSS v4 + Vanilla CSS Variables** | Custom design tokens, dark mode elevation tiers, and fluid responsive grids |
| **Icons** | **Lucide React** + **Google Material Symbols** | Crisp, standardized iconography across all controls and status indicators |
| **Animations** | **Framer Motion + CSS Keyframes** | Audio equalizer waves, glowing radar halos, modal fades, and card transitions |
| **Database & ORM** | **Prisma + PostgreSQL** | Relational data schema for Users, Rooms, Languages, Prompts, and Moderation Reports |
| **Authentication** | **NextAuth.js (Auth.js)** | Email Magic Links, Google OAuth, and Instant Anonymous Guest mode |

---

## 🖥️ Screen & Feature Walkthrough

### 1. Global Lobby & Room Directory ([`components/LobbyView.tsx`](file:///d:/comeBack/2026/voicerooms/nimble-voice/components/LobbyView.tsx))
- **Live Stats Telemetry Ribbon**: Real-time counters showing active learners online, voice rooms in progress, and live spoken languages.
- **Search & Filter Bar**:
  - Full-text search across topics, hosts, and languages with `⌘K` keyboard shortcut.
  - Tactical filter chips: *Active Only*, *With Free Seats*, *Beginner Friendly*, *Native Speakers*.
  - Horizontally scrollable carousel featuring 14 languages with live room counts (English, Spanish, French, German, Japanese, Korean, Chinese, Arabic, Russian, Portuguese, Italian, Turkish, Hindi).
- **Responsive Room Cards**:
  - Language flag and CEFR level badge (`A1`, `B1`, `C1`, `NATIVE`, `ALL`).
  - Active call duration timer and category tags (`#Casual`, `#Tech`, `#Culture`, `#ExamPrep`).
  - Participant avatar stacks featuring real-time speaking halos and audio waveforms.
  - Room slot capacity indicator (e.g., `4 / 6 slots`) and one-click **"Join Room"** button.

### 2. Live Voice Stage & Messenger ([`components/LiveVoiceRoom.tsx`](file:///d:/comeBack/2026/voicerooms/nimble-voice/components/LiveVoiceRoom.tsx))
A 68/32 responsive split-screen optimized for interactive voice immersion:
- **Top Bar Controls**:
  - Live call duration timer (`Live: 38:15`) with blinking telemetry beacon.
  - Mesh network latency monitor (`24ms mesh`).
  - **Tactical Audio Deck**:
    - **Mute / Unmute** with live peak glow indicator.
    - **Deafen** output audio toggle.
    - **Screen Share** toggle for presentations, slides, and study docs.
    - **Raise Hand** feature alerting speakers in the backchannel.
    - **Audio Device Picker** (`AirPods Pro`, `Built-in Mic`).
    - **Leave Room** high-visibility exit button.
- **Voice Stage Matrix (68%)**:
  - Dynamic participant cards displaying Host status, CEFR level, native language, and location.
  - AI-calibrated vertical equalizer soundbars animating to voice amplitude.
  - Open slot placeholders with instant **"Copy Invite Link"** action.
- **Backchannel Text Messenger (32%)**:
  - Dedicated side drawer for sharing vocabulary, spellings, idioms, and translations.
  - Quick emoji reaction bar (`🎯`, `👏`, `❤️`, `😂`, `🔥`, `💡`).
  - Real-time message stream with host badges and formatted idiom callouts.

### 3. Room Creation Modal ([`components/CreateRoomModal.tsx`](file:///d:/comeBack/2026/voicerooms/nimble-voice/components/CreateRoomModal.tsx))
- Powered by **React Hook Form + Zod v4**.
- Configurable parameters:
  - Discussion topic & title (3–80 characters).
  - Target language with country flags.
  - CEFR proficiency level requirement (*Any Level*, *Beginner A1-A2*, *Intermediate B1-B2*, *Advanced C1-C2*, *Native Only*).
  - Speaker capacity slider (2 to 8 participants).
  - Categorical tags (*#Casual & Life*, *#Grammar & Vocab*, *#Tech & Business*, *#Exam Prep*).
  - Patient & Beginner-Friendly atmosphere checkbox.
- Immediate launch & transition into the newly created room as host.

### 4. Topics & Icebreaker Starters ([`components/TopicsView.tsx`](file:///d:/comeBack/2026/voicerooms/nimble-voice/components/TopicsView.tsx))
- Categorized prompt decks:
  - *Daily Life & Icebreakers*
  - *Tech, AI & Future*
  - *Philosophy & Human Nature*
- Random prompt shuffle generator.
- One-click **"Start room with this topic"** button prefilling the room creation flow.

### 5. Audio Hardware Calibration ([`components/AudioCalibrationModal.tsx`](file:///d:/comeBack/2026/voicerooms/nimble-voice/components/AudioCalibrationModal.tsx))
- Live microphone volume sensitivity meter fluctuating with voice input.
- Web Audio API speaker test chime generator.
- AI Noise Suppression (RNNoise) and Acoustic Echo Cancellation toggles.
- Microphone input and speaker output hardware selector.

### 6. User Profile & Portfolio ([`components/ProfileModal.tsx`](file:///d:/comeBack/2026/voicerooms/nimble-voice/components/ProfileModal.tsx))
- User badges and verified speaker indicator.
- CEFR Language Portfolio with progress tags (Native, B1, A2).
- Speaking telemetry: monthly hours spoken, active streak, and peer karma score.

### 7. Community Safety & Etiquette ([`components/CommunityView.tsx`](file:///d:/comeBack/2026/voicerooms/nimble-voice/components/CommunityView.tsx))
- Microphone etiquette guidelines (headphone discipline, mute habits).
- Encouragement and patience rules for novice speakers.
- Host moderation overview (in-room kick/mute, reporting).
- Links to official Discord and Facebook community channels.

### 8. Preferences & Settings ([`components/SettingsModal.tsx`](file:///d:/comeBack/2026/voicerooms/nimble-voice/components/SettingsModal.tsx))
- Voice Input Mode: Voice Activity Detection (VAD) vs Push-to-Talk (Spacebar).
- Opus Audio Fidelity: Data Saver (32 kbps Mono), High Fidelity (64 kbps Stereo), Studio Broadcast (96 kbps Stereo).
- Audible join/leave chime alerts and direct study invite permissions.

---

## 🎨 Design System & Color Tokens

Configured in [`app/globals.css`](file:///d:/comeBack/2026/voicerooms/nimble-voice/app/globals.css) based on the **Free4Talk Stitch Design Theme**:

```css
:root {
  /* Canvas & Background */
  --bg-canvas: #0e141b;
  --surface: #0e141b;

  /* Elevation Tiers */
  --surface-container-lowest: #090f15;
  --surface-container-low: #161c23;
  --surface-container: #1a2027;
  --surface-container-high: #242a32;
  --surface-container-highest: #2f353d;

  /* Signal Accents */
  --primary: #4be277;
  --primary-container: #22c55e;
  --on-primary: #003915;
  --on-primary-container: #004b1e;
  --primary-fixed: #6bff8f;

  /* Typography Colors */
  --on-surface: #dde3ed;
  --on-surface-variant: #94a3b8;

  /* Structural Outlines & Destructive */
  --outline-variant: #2a3340;
  --error: #ef4444;
}
```

---

## 📁 Repository Structure

```
nimble-voice/
├── app/
│   ├── globals.css             # Stitch design tokens, custom scrollbars, audio animations
│   ├── layout.tsx              # Root HTML layout with Inter & Material Symbols Outlined
│   └── page.tsx                # Main App shell consuming Zustand state
├── components/
│   ├── Navbar.tsx              # Header brand, nav tabs, quick create & audio level meter
│   ├── LobbyView.tsx           # Rooms directory, search, filter chips, language carousel
│   ├── LiveVoiceRoom.tsx       # WebRTC stage (68%) & backchannel text messenger (32%)
│   ├── CreateRoomModal.tsx     # React Hook Form + Zod validated room creation dialog
│   ├── TopicsView.tsx          # Conversation starters, icebreaker shuffle & prompt deck
│   ├── CommunityView.tsx       # Safety guidelines, etiquette & moderation rules
│   ├── AboutView.tsx           # Platform mission, WebRTC infrastructure & coffee support
│   ├── ProfileModal.tsx        # User profile, CEFR language portfolio & speaking stats
│   ├── AudioCalibrationModal.tsx # Mic visualizer meter & speaker test chime
│   └── SettingsModal.tsx       # VAD vs PTT, Opus bitrates & audio hardware config
├── lib/
│   ├── data.ts                 # Type models (VoiceRoom, Participant, ChatMessage) & initial data
│   ├── schemas.ts              # Zod validation schemas for forms & profile settings
│   └── store.ts                # Zustand global store for all client-side state
├── AGENTS.md                   # Agent guidelines & technology stack rules
├── package.json                # Dependencies, scripts, and build metadata
└── tsconfig.json               # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v20+
- **npm** or **pnpm**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Rjk-Jami/nimble-voice.git
cd nimble-voice

# Install dependencies
npm install
```

### 3. Run Development Server
```bash
npm run dev
# Note for Windows PowerShell: if script execution is restricted, run:
# cmd.exe /c "npm run dev"
```
Navigate to [http://localhost:3000](http://localhost:3000) to open NimbleVoice.

### 4. Build for Production
```bash
npm run build
# Runs Turbopack compilation and TypeScript validation
```

---

## 📊 Implementation Status: What is Done vs. What is Not Done

Below is a detailed breakdown of the current implementation status across all architectural layers and features:

### ✅ Completed (Done)

| Feature / Module | Status | Details |
| :--- | :---: | :--- |
| **Design System & UI Theme** | **Done** | Stitch dark-mode tokens (`#0e141b` canvas, `#161c23` to `#2f353d` container tiers, `#22c55e` signal emeralds), Inter typography, Material Symbols Outlined, and Lucide React icons. |
| **Micro-Animations & Audio Waves** | **Done** | Animated frequency equalizers (`animate-audio-bar-1` to `4`), speaking ring halos (`speaking-pulse`), and custom slim scrollbars. |
| **Global Lobby & Directory** | **Done** | Live network telemetry ribbon (1,429 online, 68 rooms, 14 languages), full-text search with `⌘K`, tactical filter chips (*Active Only*, *Free Seats*, *Beginner*, *Native*), and 14-language carousel. |
| **Room Cards** | **Done** | Language flags, CEFR level badges, active call duration timer, participant avatar stacks with live halos, and one-click join room transitions. |
| **Live Voice Room Stage** | **Done** | 68/32 responsive split screen, participant video/avatar tiles, active speaker detection, live call timer, and latency beacon. |
| **Tactical In-Call Audio Controls** | **Done** | Mute/Unmute with live glow peak indicator, Deafen toggle, Screen Share toggle, Raise Hand button, and Leave Room exit button. |
| **In-Room Backchannel Messenger** | **Done** | Real-time text stream, host tags, idiom card highlights, quick emoji reactions (`🎯`, `👏`, `❤️`, `😂`, `🔥`, `💡`), and message input. |
| **State Management (Zustand)** | **Done** | Central store (`lib/store.ts`) managing room session, audio toggles, directory list, filter state, and modal open states. |
| **Form Validation (RHF + Zod v4)** | **Done** | Type-safe `createRoomSchema` validation in `CreateRoomModal.tsx` for room titles, language, CEFR requirements, capacity sliders, and tags. |
| **Topics & Conversation Starters** | **Done** | Categorized icebreaker decks (*Daily Life*, *Tech & AI*, *Philosophy*), random topic generator, and one-click prefilled room launcher. |
| **Audio Hardware Calibration** | **Done** | Sensitivity meter with simulated live audio amplitude, Web Audio API test chime generator, AI noise suppression, and echo cancellation toggles. |
| **User Profile & Portfolio** | **Done** | CEFR language portfolio (Native, B1, A2), speaking statistics (38.5 hrs, 18-day streak, 142 Karma), and badges. |
| **Community Safety & Rules** | **Done** | Microphone etiquette, beginner patience guidelines, in-room host moderation rules, and Discord/Facebook community links. |
| **Preferences & Settings** | **Done** | Voice Activity Detection (VAD) vs Push-to-Talk (Spacebar), Opus audio fidelity presets (32/64/96 kbps), and notification chime toggles. |
| **Build & Type Safety** | **Done** | Next.js 16.3.8 + React 19 Turbopack production build compiles with **0 errors**. |

---

### ⏳ Pending / In-Progress (What is Not Done)

The following items are next on the architectural roadmap to transition from local interactive simulation to distributed production:

| Module / System | Priority | What Needs to be Implemented |
| :--- | :---: | :--- |
| **Live WebRTC Audio Mesh** | **High** | Wire native `navigator.mediaDevices.getUserMedia` audio streams into `RTCPeerConnection` mesh connections for actual voice transmission between multiple remote browsers. |
| **Socket.io Signaling Server** | **High** | Deploy real-time WebSocket signaling server (handling `join-room`, `offer`, `answer`, `ice-candidate`, `user-disconnected`) to orchestrate peer discovery. |
| **Database & ORM (Prisma + PostgreSQL)** | **Medium** | Initialize `prisma/schema.prisma` with models for `User`, `Room`, `Message`, `Language`, and `Report`; configure PostgreSQL migrations and replace mock data with Prisma queries. |
| **Authentication (NextAuth.js / Auth.js)** | **Medium** | Setup NextAuth providers (Google OAuth + Email Magic Link + Anonymous Guest mode with persistent localStorage/cookie tokens). |
| **Production TURN/STUN Relays** | **Medium** | Deploy Coturn server or integrate Twilio/Xirsys credentials for symmetric NAT traversal across strict firewalls and mobile carrier networks. |
| **In-Room Moderation Enforcement** | **Low** | Backend enforcement for host kick/ban actions (disconnecting socket and blocking peer IP/account from re-entering). |
| **SFU Fallback for Large Rooms** | **Low** | Integrate Selective Forwarding Unit (e.g., LiveKit or Mediasoup) when voice room exceeds 8 simultaneous participants to reduce client upload bandwidth. |
