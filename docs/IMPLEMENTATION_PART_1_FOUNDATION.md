# NimbleVoice — Implementation Plan, Part 1: Foundation & Critical Fixes

> Complete this document before starting Part 2. The objective is to stabilize security, event contracts, lobby state, room membership and WebRTC mesh before adding product features.

Repositories:
- Frontend: https://github.com/Rjk-Jami/nimble-voice
- Backend: https://github.com/Rjk-Jami/nimble-voice-backend

## Architecture decisions

- Keep Next.js 16, React 19, Zustand, SWR, Go, Gin, PostgreSQL, Socket.IO and WebRTC.
- Keep peer-to-peer WebRTC mesh. Do not migrate to an SFU in this scope.
- TURN is optional. With TURN disabled, the app must continue using configured STUN servers.
- All server credentials and TURN secrets come from the backend .env file. Never put secrets in NEXT_PUBLIC variables.
- Keep local backend uploads under the configured UPLOAD_DIR (default ./uploads). No S3 or paid storage service.
- Redis is optional and disabled by default. Single-instance deployment uses in-memory presence plus PostgreSQL.
- PostgreSQL is the durable source of truth for users, rooms, membership and messages.
- Go is authoritative for identity, room membership, ownership, permissions and message persistence.
- Standardize socket event names and payloads before adding new real-time features.

---

## 0. Audit and execution rules

Before implementation:
1. Read AGENTS.md in both repositories, READMEs, package manifests, go.mod, migrations, models, routes, socket handlers and upload utilities.
2. Map every frontend API/socket producer to its Go handler and every backend event to its frontend listener.
3. Record current branch and working-tree state. Never assume the developer is on main.
4. Do not overwrite user changes, reset branches or force-push.
5. Run baseline frontend lint, typecheck and build; run backend tests, vet and build.
6. Add tests with every change. UI appearance alone is not proof of working functionality.
7. Implement one phase at a time and record changed files, migrations, commands and test results.

## 1. Critical security and environment configuration

### 1.1 Tracked .env file — treat as credential exposure

The backend default-branch repository tree contains a root .env file. Treat this as a credential exposure until verified otherwise.

Required actions:
- Do not print, copy or quote any existing .env values in logs, plans or commits.
- Confirm repository visibility and whether the file is tracked.
- Rotate every secret that has ever been stored in that file, especially JWT_SECRET, DB credentials, OAuth secrets and TURN credentials.
- Remove the real .env from Git tracking; retain it only on local/deployment machines.
- Add .env and .env.* to .gitignore while explicitly allowing .env.example.
- Review Git history. If credentials were committed, rotation is mandatory. History rewriting is a separate coordinated operation because it affects collaborators.
- Never put real credentials in example files.

### 1.2 Remove insecure source-code fallbacks

The inspected backend config loader currently has fallback values for DB_PASSWORD and JWT_SECRET. Remove hard-coded secret defaults.

- JWT_SECRET must be present and sufficiently random.
- Database credentials must come from environment/configuration.
- Production startup must fail fast when required secrets are missing.
- Validate booleans, integers, durations, URL lists and upload limits.
- Never log secret values.
- Keep only safe defaults for non-secret local development settings.

### 1.3 Backend .env.example

Update nimble-voice-backend/.env.example with non-secret placeholders. Use this template as the target configuration:

~~~env
# Application
PORT=8080
APP_ENV=development
APP_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=CHANGE_ME
DB_NAME=nimble_voice
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Dhaka
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=10
DB_CONN_MAX_LIFETIME_MINUTES=30

# Authentication
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET
JWT_ACCESS_TOKEN_TTL_MINUTES=60
JWT_GUEST_TOKEN_TTL_MINUTES=240

# WebRTC STUN
WEBRTC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun.cloudflare.com:3478

# Optional Coturn TURN
TURN_ENABLED=false
TURN_URLS=
TURN_CREDENTIAL_MODE=coturn_rest
TURN_SHARED_SECRET=
TURN_STATIC_USERNAME=
TURN_STATIC_CREDENTIAL=
TURN_CREDENTIAL_TTL_SECONDS=3600

# Local uploads
UPLOAD_DIR=./uploads
UPLOAD_BASE_URL=http://localhost:8080/uploads
MAX_FILE_SIZE_MB=25
MAX_FILES_PER_MESSAGE=10
MAX_MESSAGE_UPLOAD_SIZE_MB=100
ALLOWED_IMAGE_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif
ALLOWED_VIDEO_MIME_TYPES=video/mp4,video/webm,video/quicktime

# Room lifecycle and mesh capacity
ROOM_EMPTY_GRACE_SECONDS=30
ROOM_CLEANUP_INTERVAL_SECONDS=60
ROOM_DEFAULT_MAX_PARTICIPANTS=6

# Socket and presence
SOCKET_PING_INTERVAL_SECONDS=25
SOCKET_PING_TIMEOUT_SECONDS=20
SOCKET_MAX_PAYLOAD_MB=2
PRESENCE_HEARTBEAT_SECONDS=30
PRESENCE_STALE_AFTER_SECONDS=90

# Optional Redis — not required for one backend instance
REDIS_ENABLED=false
REDIS_URL=
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=nimblevoice:

# Logging and security
LOG_LEVEL=debug
RATE_LIMIT_ENABLED=true
TRUSTED_PROXY_CIDRS=
~~~

TURN rules:
- TURN_ENABLED=false is valid and must not prevent startup.
- TURN_URLS accepts comma-separated turn:/turns: URLs.
- TURN_SHARED_SECRET is the Coturn REST shared secret and stays on the backend.
- TURN_STATIC_USERNAME and TURN_STATIC_CREDENTIAL are development-only fallback values. Static credentials are exposed to clients and are not recommended for public production.
- Prefer Coturn REST temporary credentials. Generate an expiry-bearing username and an HMAC-SHA1 password using TURN_SHARED_SECRET; return only the temporary username/password and TURN URLs to the browser.
- Never expose TURN_SHARED_SECRET, JWT_SECRET, DB_PASSWORD or REDIS_PASSWORD in frontend bundles, browser storage, API responses or logs.
- The frontend obtains ICE configuration from an authenticated backend endpoint, not a NEXT_PUBLIC secret.
- With TURN disabled, return STUN-only configuration.
- If TURN is enabled but invalid, report a safe configuration error; do not pretend relay support is active.

### 1.4 Optional TURN implementation contract

Keep the current mesh topology. TURN adds a relay candidate; it does not change the media architecture.

Backend:
- Extend config.Config with STUN/TURN fields and validation.
- Parse and validate comma-separated ICE URL lists.
- Add an ICE configuration service.
- Add GET /api/v1/webrtc/ice-servers (or the existing versioned routing equivalent).
- Always return configured STUN URLs.
- Return TURN URLs and short-lived credentials only when TURN_ENABLED=true.
- Generate Coturn REST temporary credentials using TURN_SHARED_SECRET and TURN_CREDENTIAL_TTL_SECONDS.
- Never return the shared secret.
- Add tests for disabled TURN, invalid configuration, valid temporary credentials and expiry.

Frontend:
- Remove hard-coded ICE server credentials from lib/webrtc.ts.
- Fetch ICE configuration before creating RTCPeerConnection instances.
- Cache credentials in memory only, until shortly before expiry. Do not persist TURN credentials in localStorage.
- If the endpoint is unavailable, use STUN-only fallback and show a non-blocking diagnostic.
- Build RTCPeerConnection using the fetched RTCConfiguration.
- Keep ICE candidate pool size configurable with a conservative default.
- Joining must not be blocked just because TURN is disabled.

Example response:

~~~json
{
  "iceServers": [
    { "urls": ["stun:stun.l.google.com:19302"] },
    {
      "urls": ["turn:turn.example.com:3478?transport=udp", "turn:turn.example.com:3478?transport=tcp"],
      "username": "expiry:temporary-user",
      "credential": "temporary-password"
    }
  ],
  "expiresAt": "2026-11-11T01:00:00Z"
}
~~~

All example hosts and credentials are placeholders.

## 2. Standardize socket events and payloads

The current implementation emits multiple aliases for the same concepts and has inconsistent frontend/backend payload shapes. Standardize before extending the system.

### 2.1 Server event envelope

Use this envelope for server-originated domain events:

~~~json
{
  "eventId": "evt_01J...",
  "event": "room.member_joined",
  "schemaVersion": 1,
  "occurredAt": "2026-11-11T00:30:00Z",
  "roomId": "room_123",
  "version": 15,
  "data": {}
}
~~~

Rules:
- Canonical lowercase snake_case event names with dot-separated domains.
- Use one JSON field casing convention across all DTOs; recommended camelCase.
- eventId is unique and supports duplicate-event protection.
- version is monotonic within the room or presence aggregate.
- occurredAt is UTC RFC3339.
- Identity comes from verified JWT/socket context, never client-supplied userId.
- Client commands and server facts are separate.
- Do not emit raw database models. Use explicit DTOs.

### 2.2 Canonical event names

| Domain | Event |
|---|---|
| Presence | presence.snapshot |
| Presence | presence.updated |
| Lobby | lobby.room_created |
| Lobby | lobby.room_updated |
| Lobby | lobby.room_deleted |
| Membership | room.member_joined |
| Membership | room.member_left |
| Membership | room.snapshot |
| Room settings | room.settings_updated |
| Room lifecycle | room.deleted |
| Ownership | room.host_changed |
| Voice | voice.mute_changed |
| Voice | voice.speaking_changed |
| WebRTC | webrtc.offer |
| WebRTC | webrtc.answer |
| WebRTC | webrtc.ice_candidate |
| Screen sharing | screen_share.started |
| Screen sharing | screen_share.stopped |
| Chat | chat.message_created |
| Chat | chat.reaction_updated |
| Moderation | moderation.participant_kicked |
| Moderation | moderation.room_locked |

Client commands use a consistent command namespace, e.g. room.join, room.leave, chat.send, chat.react, host.kick, host.transfer and room.lock. A command is not a server-confirmed event.

### 2.3 Acknowledgement contract

Every state-changing command returns an acknowledgement:

~~~json
{
  "ok": true,
  "requestId": "req_123",
  "data": {},
  "error": null
}
~~~

Failures use a stable error object:

~~~json
{
  "ok": false,
  "requestId": "req_123",
  "data": null,
  "error": {
    "code": "ROOM_PASSWORD_INVALID",
    "message": "The room password is incorrect."
  }
}
~~~

Add acknowledgement timeouts and frontend loading/error states. Do not commit membership, ownership or room settings optimistically before server confirmation.

### 2.4 Migration

- Create central frontend event constants/types and matching Go DTOs.
- Update all producers and consumers in both repositories.
- Search for every old event string before removing aliases.
- During migration, accept old inbound aliases only if required for compatibility; emit only canonical events.
- Remove aliases after all clients are updated.
- Add contract tests for representative Go and TypeScript payloads.
- Remove only the exact listener function owned by a component/service; never clear unrelated listeners.

## 3. Lobby, presence and real-time room directory

### 3.1 Global Audio Network

- Remove Active Voice Rooms and Live Languages portions.
- Display only unique online users.
- Remove dummy/fallback online counts. Use loading/unknown until a real snapshot arrives.
- Remove the network stats API request if no remaining UI needs it.
- Count unique active user identities, not raw socket connections.
- Multiple sockets for one user must not inflate the count.
- Use versioned presence snapshots and updates.

### 3.2 Backend presence

The inspected BroadcastLobbyStats currently chooses the larger value of unique users and raw socket connections. Remove this behavior.

For the initial single Go instance:
- Use a concurrency-safe in-memory presence registry.
- Map authenticated user/session identity to active sockets.
- Define whether presence means connected to the app or joined to the lobby; use one definition consistently.
- Mark a user online when their first active connection appears and offline only after their final active connection disappears.
- On disconnect, remove only the disconnected socket.
- Add heartbeat/stale-session cleanup for abrupt network loss.
- On reconnect, send a fresh authoritative snapshot.
- Broadcast only when the unique count changes.

Redis is not required initially. Create a PresenceStore interface so a Redis-backed implementation can be added if multiple Go instances are deployed.

### 3.3 Frontend lobby state

The inspected hooks/useRooms.ts prefers non-empty SWR serverRooms over Zustand storeRooms. A stale REST response can therefore overwrite newer socket state.

Fix:
- Use one normalized canonical room collection in the lobby store.
- REST supplies initial snapshot; socket events supply ordered updates.
- Merge by stable backend room ID and room version.
- Ignore stale socket events and stale REST snapshots.
- Reconcile after reconnect with one fresh snapshot.
- Do not unconditionally prefer SWR when it is non-empty.
- Avoid polling data already maintained by socket events; retain only slow fallback revalidation if needed.

### 3.4 Navbar, profile and search

- Remove independent Sign In navbar button.
- Move Sign In / Create Account into the user profile modal for guests.
- Authenticated users see profile, settings and Sign Out.
- Remove Create a New Group from navbar.
- Keep room creation in lobby/dedicated creation flow.
- Fix search/filter flicker using a stable grid with fixed-size controls and minmax(0, 1fr).
- Hover must not change width, height, padding or document flow. Prefer color, opacity and transform.
- Verify mobile, tablet and desktop layouts.

## 4. Fix room creation, joining and participant state

The inspected frontend creates a temporary room-1794340569235 ID, inserts it into Zustand and joins locally before backend persistence, then mutates the ID. This can leave stores and references inconsistent.

Correct flow:
1. Validate form.
2. Authenticate and authorize creator.
3. Create room through backend.
4. Receive canonical persisted room ID and room snapshot.
5. Insert canonical room into lobby state.
6. Join through backend-authorized join flow.
7. Enter voice room only after successful join acknowledgement.

The inspected joinRoom also inserts the participant locally before backend confirmation and treats 404 as permission to continue in local mesh mode. Remove this bypass for public rooms.

Membership rules:
- Backend is source of truth.
- One active membership per (room_id, user_id).
- One user cannot be counted twice because of duplicate sockets/events.
- A socket is not a participant.
- Never insert bots or synthetic participants.
- Join response includes canonical participant snapshot and member count.
- All clients reconcile against the same room version.
- Rejected join leaves user outside the room.
- Leave and disconnect cleanup are idempotent.

## 5. WebRTC mesh reliability — critical acceptance gate

Keep mesh as requested. Do not migrate to SFU in this scope.

### 5.1 Mesh capacity

Mesh peer connections grow approximately as n * (n - 1) / 2, and each publisher uploads media to every other peer. Therefore:
- Set conservative configurable room capacity.
- Start with a small default, e.g. 4–6 participants, and test on real devices/networks.
- Do not promise large-room scalability with mesh.
- Make capacity configurable through backend config and persisted room settings.
- Document SFU as a possible future architecture, not current implementation.

### 5.2 Microphone acquisition

The inspected initLocalMedia silently creates a disabled silent audio track after microphone errors. Remove this fallback.

- getUserMedia failure must reject with a typed error.
- Show permission/device error and retry action.
- Never show connected/speaking state without a real microphone track.
- Keep mute state separate from permission state.
- Handle device removal and track ended.
- Test permission denied, no device, device busy and device switching.

### 5.3 Signaling and negotiation

Audit existing Perfect Negotiation before changing it. Preserve correct collision handling and ICE queueing, but verify:
- Exactly one RTCPeerConnection per remote participant session.
- Stable peer identity mapping across reconnects.
- Valid offer/answer transitions.
- ICE candidates queue until remote description is installed.
- Candidate queues clear on peer removal.
- Simultaneous joins do not create duplicate peers.
- Duplicate room.member_joined events do not trigger duplicate offers.
- ICE restart is rate-limited and handles recoverable failures.
- Stale signaling from a previous peer generation is ignored.
- Errors are observable; do not silently swallow signaling failures.

### 5.4 ICE, TURN and audio lifecycle

- Use configured STUN servers.
- Add optional Coturn via the backend ICE endpoint in Section 1.4.
- TURN disabled means STUN-only and must not break joining.
- Test host, srflx and relay candidate paths.
- Verify actual audio packets and remote audio, not merely socket connection.
- Test same LAN, different home networks, mobile hotspot, restrictive NAT and TURN relay.
- Never expose TURN shared secret to frontend.

Audio lifecycle:
- Attach remote audio elements to correct streams.
- Handle browser autoplay restrictions with user gesture and handle audio.play() rejection.
- Do not stop remote tracks owned by a peer unless disposing that peer.
- On leave, close peer connections, stop local mic/screen tracks, detach audio elements and clear timers/analysers.
- In React Strict Mode/unmount, remove only listeners owned by the manager.
- Reconnect must not leave stale peer maps or duplicate audio elements.

### 5.5 Diagnostics

In development, record peer/socket ID, signaling state, connection state, ICE state, selected candidate type, track state, offer/answer/ICE errors and reconnect attempts.

Never log auth tokens, TURN credentials, passwords or chat contents.

## 6. Part 1 acceptance checklist

Do not start Part 2 until every item has evidence:

- [ ] Real .env is untracked; exposed credentials have been rotated.
- [ ] No insecure hard-coded secret fallbacks remain.
- [ ] .env.example documents required and optional configuration without real secrets.
- [ ] TURN disabled starts normally and returns STUN-only configuration.
- [ ] TURN enabled returns temporary credentials; shared secret never reaches client.
- [ ] Frontend has no hard-coded ICE credentials.
- [ ] Canonical socket event names/payloads are used by both repos.
- [ ] Duplicate/stale events do not corrupt state.
- [ ] Online count represents unique users, not raw sockets.
- [ ] Global Audio Network displays only online users.
- [ ] Stale SWR responses cannot overwrite newer socket state.
- [ ] Navbar/profile/search changes are stable at responsive breakpoints.
- [ ] Room creation uses canonical backend ID.
- [ ] Join rejection never leaves phantom participant.
- [ ] No bot/fake participant is injected.
- [ ] Two real devices hear each other on first attempt over different networks.
- [ ] Microphone failure is visible; no fake silent track is created.
- [ ] Mesh capacity is explicit and tested.

## 7. Validation commands

Run only scripts that exist in the repository.

Frontend:
~~~bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
~~~

Backend:
~~~bash
go test ./...
go vet ./...
go build ./...
~~~

Also run focused tests for config parsing, TURN credential generation, event DTOs, presence, room join/leave and WebRTC signaling. Browser tests must use at least two real browser contexts on different networks; unit tests alone cannot prove audio works.

**Part 1 is complete only when all acceptance criteria pass.**
