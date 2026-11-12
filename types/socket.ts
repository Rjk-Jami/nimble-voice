export const SOCKET_SCHEMA_VERSION = 1 as const;

export type CanonicalServerEvent =
  | "presence.snapshot"
  | "presence.updated"
  | "lobby.room_created"
  | "lobby.room_updated"
  | "lobby.room_deleted"
  | "room.member_joined"
  | "room.member_left"
  | "room.snapshot"
  | "room.settings_updated"
  | "room.deleted"
  | "room.host_changed"
  | "voice.mute_changed"
  | "voice.speaking_changed"
  | "webrtc.offer"
  | "webrtc.answer"
  | "webrtc.ice_candidate"
  | "screen_share.started"
  | "screen_share.stopped"
  | "chat.message_created"
  | "chat.reaction_updated"
  | "moderation.participant_kicked"
  | "moderation.room_locked";

export type CanonicalClientCommand =
  | "lobby.join"
  | "lobby.leave"
  | "presence.request"
  | "room.join"
  | "room.leave"
  | "webrtc.offer"
  | "webrtc.answer"
  | "webrtc.ice_candidate"
  | "voice.mute"
  | "voice.speaking"
  | "screen_share.start"
  | "screen_share.stop"
  | "chat.react"
  | "moderation.mute_participant"
  | "moderation.kick_participant"
  | "moderation.lock_room"
  | "mesh.ping";

export type AckErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "ROOM_FULL"
  | "ROOM_LOCKED"
  | "INTERNAL_ERROR"
  | "TIMEOUT"
  | "DISCONNECTED";

export interface AckError {
  code: AckErrorCode | (string & {});
  message: string;
}

export interface CommandAck<TData = unknown> {
  ok: boolean;
  requestId: string;
  data?: TData;
  error?: AckError;
}

export interface ServerEventEnvelope<
  TData = unknown,
  TEvent extends CanonicalServerEvent = CanonicalServerEvent,
> {
  eventId: string;
  event: TEvent;
  schemaVersion: typeof SOCKET_SCHEMA_VERSION;
  occurredAt: string;
  roomId?: string;
  version: number;
  data: TData;
}

export interface PresenceDTO {
  onlineCount: number;
}

export interface UserSummaryDTO {
  id: string;
  name: string;
  avatarUrl?: string;
  location?: string;
  nativeLanguage?: string;
  learningLanguage?: string;
  isVerified: boolean;
  isGuest: boolean;
  cefrPortfolio: Record<string, string>;
  karma: number;
  hoursSpoken: number;
  streak: number;
}

export interface VoiceStateDTO {
  isMuted: boolean;
  isDeafened: boolean;
  handRaised: boolean;
  isScreenSharing: boolean;
}

export interface ParticipantDTO extends UserSummaryDTO {
  isHost: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  handRaised: boolean;
  isScreenSharing: boolean;
  socketId: string;
}

export interface PeerSnapshotDTO {
  socketId: string;
  userId: string;
  participant: ParticipantDTO;
  voiceState: VoiceStateDTO;
}

export interface RoomSummaryDTO {
  id: string;
  title: string;
  topic: string;
  language: string;
  flag: string;
  cefrLevel: string;
  levelLabel: string;
  maxSlots: number;
  currentSlots: number;
  tags: string[];
  status: string;
  startedAt: string;
  hasFreeSeats: boolean;
  isBeginnerFriendly: boolean;
  hasNativeSpeaker: boolean;
  isLive: boolean;
  isLocked: boolean;
  version: number;
  host: UserSummaryDTO;
}

export interface RoomLobbyUpdateDTO {
  roomId: string;
  currentSlots: number;
  maxSlots: number;
  hasFreeSeats: boolean;
  status: string;
  isLocked: boolean;
  hostId?: string;
}

export interface RoomSnapshotDTO {
  roomId: string;
  room?: RoomSummaryDTO;
  peers: PeerSnapshotDTO[];
  isLocked: boolean;
}

export interface RoomMemberJoinedDTO {
  roomId: string;
  socketId: string;
  userId: string;
  participant: ParticipantDTO;
  joinedAt: string;
}

export interface RoomMemberLeftDTO {
  roomId: string;
  userId: string;
  socketId: string;
  reason: string;
  leftAt: string;
}

export interface RoomSettingsUpdatedDTO {
  roomId: string;
  title?: string;
  topic?: string;
  status?: string;
  maxSlots?: number;
  hasFreeSeats?: boolean;
}

export interface RoomDeletedDTO {
  roomId: string;
  reason?: string;
}

export interface RoomHostChangedDTO {
  roomId: string;
  previousHostId: string;
  newHostId: string;
}

export interface VoiceMuteChangedDTO {
  roomId: string;
  userId: string;
  isMuted: boolean;
  isDeafened?: boolean;
  handRaised?: boolean;
  forcedByHost: boolean;
  reason?: string;
}

export interface VoiceSpeakingChangedDTO {
  roomId: string;
  userId: string;
  isSpeaking: boolean;
  level: number;
}

export interface WebRTCOfferDTO {
  roomId: string;
  targetSocketId: string;
  senderSocketId: string;
  senderUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerDTO {
  roomId: string;
  targetSocketId: string;
  senderSocketId: string;
  senderUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidateDTO {
  roomId: string;
  targetSocketId: string;
  senderSocketId: string;
  senderUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface ScreenShareDTO {
  roomId: string;
  userId: string;
  socketId: string;
  isSharing: boolean;
}

export interface ChatSenderDTO {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatMessageDTO {
  id: string;
  clientMessageId?: string;
  roomId: string;
  sender: ChatSenderDTO;
  content: string;
  type: string;
  mediaUrl?: string;
  mediaType?: string;
  isHighlighted: boolean;
  reactions: Record<string, string[]>;
  createdAt: string;
}

export interface ChatReactionUpdatedDTO {
  roomId: string;
  messageId: string;
  emoji: string;
  userId: string;
  reactions?: Record<string, string[]>;
}

export interface ModerationParticipantKickedDTO {
  roomId: string;
  targetUserId: string;
  kickedBy: string;
  reason: string;
}

export interface ModerationRoomLockedDTO {
  roomId: string;
  isLocked: boolean;
  updatedBy: string;
}

export interface LobbySubscriptionAckDTO {
  subscribed: boolean;
}

export interface RoomJoinAckDTO {
  roomId: string;
  socketId: string;
  version: number;
  snapshot: RoomSnapshotDTO;
}

export interface RoomLeaveAckDTO {
  roomId: string;
  left: boolean;
}

export interface DeliveryAckDTO {
  delivered: boolean;
}

export interface MeshPingAckDTO {
  serverTime: number;
}

export interface ModerationMuteAckDTO {
  roomId: string;
  targetUserId: string;
  isMuted: boolean;
}

export interface ModerationKickAckDTO {
  roomId: string;
  targetUserId: string;
}

export interface ModerationLockAckDTO {
  roomId: string;
  isLocked: boolean;
}

export interface ScreenShareAckDTO {
  roomId: string;
  isSharing: boolean;
}

export interface ChatReactAckDTO {
  roomId: string;
  messageId: string;
  emoji: string;
}

export interface ServerEventPayloadMap {
  "presence.snapshot": PresenceDTO;
  "presence.updated": PresenceDTO;
  "lobby.room_created": RoomSummaryDTO;
  "lobby.room_updated": RoomLobbyUpdateDTO;
  "lobby.room_deleted": RoomDeletedDTO;
  "room.member_joined": RoomMemberJoinedDTO;
  "room.member_left": RoomMemberLeftDTO;
  "room.snapshot": RoomSnapshotDTO;
  "room.settings_updated": RoomSettingsUpdatedDTO;
  "room.deleted": RoomDeletedDTO;
  "room.host_changed": RoomHostChangedDTO;
  "voice.mute_changed": VoiceMuteChangedDTO;
  "voice.speaking_changed": VoiceSpeakingChangedDTO;
  "webrtc.offer": WebRTCOfferDTO;
  "webrtc.answer": WebRTCAnswerDTO;
  "webrtc.ice_candidate": WebRTCIceCandidateDTO;
  "screen_share.started": ScreenShareDTO;
  "screen_share.stopped": ScreenShareDTO;
  "chat.message_created": ChatMessageDTO;
  "chat.reaction_updated": ChatReactionUpdatedDTO;
  "moderation.participant_kicked": ModerationParticipantKickedDTO;
  "moderation.room_locked": ModerationRoomLockedDTO;
}
