# NimbleVoice — Implementation Plan, Part 2: Product Features & Completion

> **Prerequisite:** Part 1 is completed and accepted. This plan assumes standardized socket contracts, backend-authoritative membership, reliable mesh audio, secure environment configuration and a synchronized lobby.
>
> **Decisions:** Keep WebRTC mesh; TURN optional; local backend /uploads storage; Redis optional; PostgreSQL remains durable source of truth.

---

## 1. Room lifecycle settings and automatic cleanup

### 1.1 One-time room

- Room is created for one conversation session.
- When the final real participant leaves, mark the room as closing.
- Wait ROOM_EMPTY_GRACE_SECONDS to allow short reconnects.
- If a valid participant rejoins during grace period, cancel deletion.
- Otherwise remove active memberships and delete the room and dependent ephemeral records according to foreign-key/cascade policy.
- Broadcast room.deleted and lobby.room_deleted.
- Old room links must no longer permit joining.

### 1.2 Reusable 30-day room

- Room can be reused during its lifetime.
- Set expiresAt = createdAt + 30 days.
- Empty rooms remain available until expiry unless the owner explicitly deletes them.
- At expiry, reject new joins and clean up the room.
- UI copy must say “Reusable for up to 30 days”.
- Do not show room lifetime/age on room cards.

### 1.3 Data model and cleanup

After inspecting the actual model/migration strategy, add fields equivalent to:

~~~go
type Room struct {
    // Existing fields...
    LifecycleType string
    ExpiresAt      *time.Time
    IsLocked       bool
    PasswordHash   *string
    Version        uint64
}
~~~

Use enum/check constraint for ONE_TIME and THIRTY_DAYS.

Cleanup worker requirements:
- Configurable interval.
- Database transactions and row locking.
- Re-check room is still empty before deleting.
- Safe if multiple cleanup workers run.
- Idempotent.
- Remove dependent ephemeral records and local files only when no longer referenced.
- Log room IDs/outcomes, never passwords or message contents.

Do not delete a persisted room merely because one socket disconnects. Socket disconnect does not prove all sessions for a user are gone.

## 2. Participant list and real-time updates

Use Part 1 canonical room.member_joined, room.member_left and room.snapshot events.

- Broadcast join only after backend membership commits.
- Broadcast leave only after membership is removed/marked left.
- Participant identity comes from authenticated backend user.
- Each participant appears once.
- Member count equals canonical active participant list.
- Reconnect reconciles with a snapshot; it does not blindly append.
- Lobby receives member count changes through lobby.room_updated.
- Target dashboard propagation latency is under 3 seconds under normal connectivity.
- No bots, system placeholders or fake learners.
- Room cards show title, language, CEFR level, host, participant count/capacity and join availability only.
- Remove room age and “started X minutes ago”.

Investigate the reported mismatch where one user sees two participants while another sees four. Verify participant count, socket-to-user mapping, repeated join events and frontend optimistic state all use canonical user IDs.

## 3. Host authentication and room creation authorization

Guests may browse and join public rooms if allowed, but only registered authenticated accounts may create/host.

Frontend:
- Move Sign In / Create Account into user profile modal.
- Guest selecting Create Room sees sign-in/register prompt.
- Hide host-only controls from guests.
- Preserve frictionless guest join to public rooms.
- Audit token storage; prefer secure HttpOnly cookies where compatible with existing auth design.

Backend:
- Protect room creation with authenticated-user middleware.
- Reject guest identities even if frontend is bypassed.
- Derive creator/host identity from verified JWT claims.
- Never trust userId, hostId, role or user profile in socket payloads.
- Verify host permission for every moderation/settings command.
- Test unauthenticated, guest, registered and host access.

| Action | Guest | Registered member | Current host |
|---|---:|---:|---:|
| Browse public rooms | Yes | Yes | Yes |
| Join public room | If allowed | Yes | Yes |
| Create room | No | Yes | Yes |
| Kick participant | No | No | Yes |
| Transfer ownership | No | No | Yes |
| Lock/unlock | No | No | Yes |
| Change password | No | No | Yes |
| Delete room | No | No | Yes |

## 4. Host moderation and ownership

### 4.1 Kick participant

Implement host-only command with request ID and acknowledgement.

Backend:
1. Authenticate socket and derive actor ID.
2. Verify actor is current host.
3. Verify target is active in room.
4. Commit kick/removal state.
5. Remove target room membership and socket subscription.
6. Broadcast moderation.participant_kicked and room.member_left.
7. Close target peer connections on remaining mesh clients.
8. Apply optional short rejoin cooldown if required.

Kicked client receives a clear reason code and returns to lobby. A normal participant must never kick another user by forging an event.

### 4.2 Transfer ownership

- Add participant context-menu action visible only to host.
- Show confirmation dialog.
- Backend validates actor, target and room.
- Update rooms.host_id and participant roles in one transaction.
- Increment room version.
- Broadcast room.host_changed.
- Update host badge and host-only controls without reload.
- Previous host loses host permission immediately.

### 4.3 Automatic host succession

If host leaves/disconnects:
- Wait configured reconnect grace period before treating host as gone.
- Select longest-attending eligible active participant using persisted joinedAt.
- Exclude departing host, kicked users, inactive memberships and synthetic users.
- Update ownership/role in one transaction.
- Broadcast room.host_changed.
- If no eligible participant exists, close/delete according to lifecycle policy.
- Use row locking/version checks to prevent concurrent disconnects selecting multiple hosts.

Suggested query (verify actual schema/column names before use):

~~~sql
SELECT user_id
FROM room_participants
WHERE room_id = $1
  AND left_at IS NULL
  AND user_id <> $2
ORDER BY joined_at ASC
LIMIT 1;
~~~

Add deterministic tie-breaker such as participant ID.

## 5. Lock, unlock and password-protected rooms

Room settings UI:
- Lock room toggle.
- Require password toggle.
- Password and confirmation fields.
- Save button.
- Clear state when protection is disabled, subject to product policy.

Backend:
- Persist isLocked.
- Store bcrypt password hash only; never plaintext.
- Only host can change lock/password.
- Verify password before creating membership.
- Do not send password/hash in events or room snapshots.
- Rate-limit invalid attempts by user/session and IP.
- Return stable errors such as ROOM_LOCKED and ROOM_PASSWORD_INVALID.
- Existing members remain connected when room is locked; locking prevents new joins.
- REST join and Socket.IO join use the same authorization service so neither can bypass the other.

## 6. Chat: canonical persistence and duplicate prevention

The inspected frontend currently adds an optimistic message, emits a socket command and also sends a separate REST create request. Its sender filter expects msg.sender.id while backend event shape may not include that nested object. This can duplicate messages and omit sender names.

### 6.1 One canonical send pipeline

Recommended: Socket.IO command with acknowledgement, backend persistence, then canonical broadcast.

Request:

~~~json
{
  "requestId": "req_123",
  "clientMessageId": "client_abc",
  "roomId": "room_123",
  "content": "Hello everyone!",
  "type": "TEXT",
  "attachmentIds": []
}
~~~

Backend:
- Authenticate sender.
- Verify active room membership.
- Validate message type/content/attachment ownership.
- Enforce rate and size limits.
- Persist once.
- Resolve sender profile from authenticated identity.
- Return/broadcast saved canonical message.
- Deduplicate retries using unique constraint on (sender_id, client_message_id) or equivalent.
- Never trust sender name/avatar submitted by browser.

Canonical response includes id, clientMessageId, roomId, sender {id, name, avatarUrl}, content, type, attachments, createdAt and reactions.

Frontend:
- Generate clientMessageId.
- Show one optimistic pending message.
- On acknowledgement/broadcast, reconcile by clientMessageId and replace pending item with canonical server message.
- Never append a second copy.
- On failure, show retry state; retry reuses same clientMessageId.
- Fetch history once on room entry and merge by canonical message ID.
- Store timestamps as UTC ISO; format only for display.

### 6.2 Sender identity

- Backend derives sender from authenticated context.
- All message events include the same sender object.
- Frontend normalizer follows canonical contract.
- Never render blank sender name if backend user exists.
- Add sender/receiver rendering tests.

### 6.3 Multiple image/video attachments using local storage

Keep local backend /uploads. Do not add cloud object storage.

Frontend composer:
- Select multiple images and videos.
- Show previews, filenames, sizes and upload progress.
- Remove individual pending attachments.
- Retry failed uploads.
- Send text and multiple attachments together.
- Responsive image grid, image lightbox and native video controls.
- Handle cancellation and room exit.

Backend:
- Room-authorized multipart endpoint.
- Accept repeated files[] fields.
- Verify file signature/content, not only client MIME.
- Enforce MAX_FILE_SIZE_MB, MAX_FILES_PER_MESSAGE, MAX_MESSAGE_UPLOAD_SIZE_MB and MIME allowlists from environment.
- Generate random server filenames; never use untrusted path segments.
- Store inside configured UPLOAD_DIR using safe random/date/room subdirectories.
- Persist attachment metadata and associate with canonical message.
- Serve via existing /uploads static route with correct content types and safe headers.
- Prevent path traversal and arbitrary file reads.
- Require authentication and room membership.
- Clean abandoned temporary files.
- Never delete a file still referenced by a message.
- Monitor disk space and upload errors.

Prefer a relational MessageAttachment table for queryability, cleanup and moderation if compatible with existing schema. Otherwise validate and normalize JSON attachment metadata consistently.

### 6.4 Emoji picker and chat cleanup

- Add searchable emoji popover beside composer.
- Include normal emoji categories and recent emojis.
- Keep existing message reactions.
- Remove headphones/heard icon from chat header.
- Remove duplicate indicators that do not map to real backend state.
- Preserve sender, timestamp, reactions and attachment previews.

## 7. Screen sharing

Keep screen sharing in existing mesh.

- User initiates getDisplayMedia from explicit button click.
- Publish video track to each current peer connection.
- Ensure newly joined peers receive active share if policy allows.
- Broadcast screen_share.started / screen_share.stopped with room/user metadata.
- Actual video is delivered by WebRTC; socket event is notification/state only.
- Render remote video in shared-screen stage with sharer name.
- Handle browser stop-sharing through track.onended.
- Remove/replace sender track and renegotiate safely when sharing stops.
- Recommended mesh policy: one active sharer at a time.
- Clean local/remote screen tracks on stop, leave, kick and disconnect.
- Do not show sharing as active until capture and track publication succeed.

Acceptance: second device receives notification and actual moving video; remote view disappears when sharing stops.

## 8. Remove Raise Hand and unnecessary UI

Remove Raise Hand across the stack:
- Remove UI button/icon.
- Remove handRaised from frontend stores/types.
- Remove toggle callbacks and event payloads.
- Remove backend socket handlers and DTO fields.
- Remove obsolete tests/docs.
- Drop database field only after checking all schema consumers and migration needs.

Other UI:
- Remove room lifetime from cards.
- Remove redundant “transmitting” text/indicator; keep clear microphone mute icon and accessible label.
- Do not remove actual mute functionality or useful connection diagnostics.

## 9. One active window per device

Use browser and backend enforcement.

Browser:
- Use Web Locks API with one same-origin exclusive lock for active NimbleVoice session.
- Hold lock while active app session runs.
- If unavailable, show “NimbleVoice is already open in another tab”.
- Use BroadcastChannel for tab coordination/UX, not as security boundary.
- Release lock during normal cleanup.

Backend:
- Generate random device ID per browser installation.
- Associate authenticated session with device ID.
- Use atomic active-session replacement/lease.
- When a newer session replaces an older one, invalidate and disconnect old socket.
- Handle race conditions, reconnects and stale sessions.
- Do not use fingerprinting instead of a user-controlled random device ID.
- Recommended: one active voice session per device for guests and registered users.

## 10. Redis — optional future scaling

Do not add Redis as a required service.

Single Go instance:
- Concurrency-safe in-memory presence/session maps.
- PostgreSQL for durable data.
- Existing Go background worker for cleanup.
- On process restart, clients reconnect and request fresh snapshots.
- No Redis required.

Multiple Go instances later:
- Add PresenceStore, SessionStore and EventBroadcaster interfaces.
- Implement Redis-backed shared presence, active-session coordination and cross-instance event distribution.
- Redis Community Edition is free/open-source to self-host, but server CPU/RAM/disk/network still have hosting cost.
- Do not use Redis as durable storage for rooms or chat.
- Do not add Redis until multi-instance deployment actually requires shared state.

## 11. UI and product polish

- Sign In moves into user profile modal.
- Navbar Create a New Group removed.
- Global Audio Network shows online users only.
- Active voice rooms and live languages removed from that panel.
- Search/filter uses stable grid and does not flicker on hover.
- Room cards do not show room lifetime.
- Participant count is canonical and consistent.
- Chat header no longer shows headphones/heard icon.
- Emoji popover provides normal emojis.
- Mute control remains clear and accessible.
- Host controls are conditionally visible, but backend authorization remains mandatory.

## 12. Test and acceptance matrix

### Room lifecycle
- [ ] One-time room deletes after final member leaves and grace period passes.
- [ ] Rejoin during grace period cancels deletion.
- [ ] 30-day room remains reusable until expiry.
- [ ] Expired room rejects joins and is cleaned up.
- [ ] Deletion updates lobby clients.
- [ ] No bot/fake participant appears.
- [ ] Participant counts match across all clients.

### Host/security
- [ ] Guest cannot create room.
- [ ] Registered user can create room.
- [ ] Non-host cannot kick, lock, change password or transfer ownership.
- [ ] Host can kick real participant.
- [ ] Ownership transfer updates all clients.
- [ ] Host disconnect transfers ownership to longest-attending eligible participant after grace period.
- [ ] Concurrent disconnects never create multiple hosts.
- [ ] Correct password allows joining.
- [ ] Incorrect password is rejected and rate-limited.
- [ ] Locked room rejects new members while existing members remain connected.

### Chat/uploads
- [ ] Sender sees exactly one message.
- [ ] Every receiver sees exactly one message.
- [ ] Sender name/avatar are present.
- [ ] Retry does not duplicate.
- [ ] Message history survives reload.
- [ ] Multiple images can be sent together.
- [ ] Video upload/playback works.
- [ ] Invalid MIME/signature, oversized files and path traversal are rejected.
- [ ] Upload progress, failure and retry work.
- [ ] Emoji picker and reactions work.

### Screen share/media
- [ ] Remote user receives screen-share notification.
- [ ] Remote user sees actual screen video.
- [ ] Browser stop-sharing stops remote view.
- [ ] New participant receives active share if policy allows.
- [ ] No stale screen tracks remain after leave/kick.
- [ ] Audio remains two-way during screen sharing.

### Single-device session
- [ ] Second tab cannot start another active session.
- [ ] Backend replaces/rejects competing session atomically.
- [ ] Old tab receives session-replaced state.
- [ ] Reconnect does not create duplicate active sessions.

### Final quality
- [ ] Frontend lint, typecheck and production build pass.
- [ ] Backend tests, vet and build pass.
- [ ] Browser regression suite passes on at least two real devices.
- [ ] Uploads persist under configured local UPLOAD_DIR.
- [ ] Redis is not required for single-instance deployment.
- [ ] No secret appears in frontend bundles, browser storage, API responses, socket events or logs.

## 13. Execution order inside Part 2

1. Room lifecycle schema and cleanup worker.
2. Canonical participant snapshots and join/leave reconciliation.
3. Host authentication and room creation policy.
4. Kick, ownership transfer and automatic succession.
5. Lock/password enforcement.
6. Chat canonical persistence and idempotency.
7. Multiple local image/video uploads.
8. Screen-share event and track delivery.
9. Raise Hand removal and remaining UI cleanup.
10. Web Locks and backend single-device session enforcement.
11. Full regression, security and load testing.

Do not mark complete until each acceptance item has test evidence. Maintain an implementation log with changed files, migrations, commands, test outcomes and unresolved issues.
