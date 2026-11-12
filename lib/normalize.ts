import { VoiceRoom, Participant, User, ChatMessage } from "@/types";
import { Language, CEFRLevel, RoomStatus, LANGUAGE_FLAGS } from "@/enums";

/**
 * Normalizes user objects coming from either the Go backend (snake_case)
 * or local Next.js client schemas (camelCase).
 */
export function normalizeUser(raw: any): User {
  if (!raw) {
    return {
      id: "usr_guest",
      name: "Learner",
      nativeLanguage: "English",
      learningLanguage: "Spanish",
      isVerified: false,
      cefrPortfolio: {},
      karma: 0,
      hoursSpoken: 0,
      streak: 1,
    };
  }

  return {
    id: raw.id || raw.userId || raw.user_id || `usr_${Date.now()}`,
    name: raw.name || "Learner",
    avatarUrl: raw.avatarUrl || raw.avatar_url || raw.avatar,
    location: raw.location || "Global",
    nativeLanguage: raw.nativeLanguage || raw.native_language || "English",
    learningLanguage: raw.learningLanguage || raw.learning_language || "Spanish",
    isVerified: !!(raw.isVerified ?? raw.is_verified),
    isGuest: !!(raw.isGuest ?? raw.is_guest),
    karma: raw.karma ?? 0,
    hoursSpoken: raw.hoursSpoken ?? raw.hours_spoken ?? 0,
    streak: raw.streak ?? 1,
    cefrPortfolio: raw.cefrPortfolio || raw.cefr_portfolio || {},
    totalRoomsJoined: raw.totalRoomsJoined ?? raw.total_rooms_joined ?? 0,
    frequentPartnersCount: raw.frequentPartnersCount ?? raw.frequent_partners_count ?? 0,
  };
}

/**
 * Normalizes participant objects from legacy REST shapes as well as canonical
 * PeerSnapshotDTO and RoomMemberJoinedDTO Socket.IO payloads.
 */
export function normalizeParticipant(raw: any): Participant {
  if (!raw || typeof raw !== "object") {
    const fallback = normalizeUser(null);
    return {
      ...fallback,
      isHost: false,
      isSpeaking: false,
      isMuted: false,
      isDeafened: false,
      handRaised: false,
      isScreenSharing: false,
      audioLevel: 0,
    };
  }

  const userObj = raw.participant || raw.user || raw;
  const voice = raw.voiceState || raw.participant || raw;
  const baseUser = normalizeUser(userObj);
  const id = raw.userId || raw.user_id || userObj.id || raw.id || baseUser.id;
  const peerId =
    raw.socketId ??
    raw.socket_id ??
    userObj.socketId ??
    userObj.socket_id ??
    raw.peerId ??
    raw.peer_id;

  return {
    ...baseUser,
    id,
    isHost: !!(userObj.isHost ?? userObj.is_host ?? raw.isHost ?? raw.is_host),
    isSpeaking: !!(
      voice.isSpeaking ??
      voice.is_speaking ??
      raw.isSpeaking ??
      raw.is_speaking
    ),
    isMuted: !!(voice.isMuted ?? voice.is_muted ?? raw.isMuted ?? raw.is_muted),
    isDeafened: !!(
      voice.isDeafened ??
      voice.is_deafened ??
      raw.isDeafened ??
      raw.is_deafened
    ),
    handRaised: !!(
      voice.handRaised ??
      voice.hand_raised ??
      raw.handRaised ??
      raw.hand_raised
    ),
    isScreenSharing: !!(
      voice.isScreenSharing ??
      voice.is_screen_sharing ??
      raw.isScreenSharing ??
      raw.is_screen_sharing
    ),
    audioLevel:
      voice.audioLevel ??
      voice.audio_level ??
      raw.audioLevel ??
      raw.audio_level ??
      0,
    peerId,
  };
}

/**
 * Normalizes voice room objects from Go GORM entities into client-compatible VoiceRoom models.
 */
export function normalizeRoom(raw: any): VoiceRoom {
  if (!raw) return raw;

  const lang = (raw.language || "English") as Language;
  const flag = raw.flag || LANGUAGE_FLAGS[lang] || "🌐";
  const cefr = (raw.cefrLevel || raw.cefr_level || CEFRLevel.ANY) as CEFRLevel;
  const maxSlots = Number(raw.maxSlots ?? raw.max_slots ?? raw.maxParticipants ?? 5);
  const currentSlots = Number(raw.currentSlots ?? raw.current_slots ?? (Array.isArray(raw.participants) ? raw.participants.length : 1));

  const host = raw.host ? normalizeUser(raw.host) : {
    id: "usr_host",
    name: "Host",
    nativeLanguage: lang,
    learningLanguage: "English",
    isVerified: true,
    cefrPortfolio: {},
    karma: 100,
    hoursSpoken: 20,
    streak: 5,
  };

  const participants = Array.isArray(raw.participants)
    ? raw.participants.map(normalizeParticipant)
    : [];

  return {
    id: String(raw.id || raw.roomId || raw.room_id || `room_${Date.now()}`),
    title: raw.title || "Voice Lounge",
    topic: raw.topic || raw.title || "Casual Chat",
    language: lang,
    flag,
    cefrLevel: cefr,
    levelLabel: raw.levelLabel || raw.level_label || "All Levels Welcome",
    maxSlots,
    currentSlots,
    tags: Array.isArray(raw.tags)
      ? raw.tags
      : raw.topicTag
      ? [raw.topicTag]
      : ["Casual & Life"],
    status: raw.status || RoomStatus.LIVE,
    startedAt: raw.startedAt || raw.started_at || new Date().toISOString(),
    activeSinceMinutes: Number(raw.activeSinceMinutes ?? raw.active_since_minutes ?? 1),
    hasFreeSeats: raw.hasFreeSeats ?? raw.has_free_seats ?? (currentSlots < maxSlots),
    isBeginnerFriendly: raw.isBeginnerFriendly ?? raw.is_beginner_friendly ?? true,
    hasNativeSpeaker: raw.hasNativeSpeaker ?? raw.has_native_speaker ?? false,
    isLive: raw.isLive ?? raw.is_live ?? (raw.status !== "ENDED"),
    host,
    participants,
    messages: Array.isArray(raw.messages) ? raw.messages.map(normalizeMessage) : [],
  };
}

/**
 * Normalizes message reaction maps, converting null, undefined, legacy [] arrays,
 * or non-object values into a clean Record<string, string[]> map.
 */
export function normalizeReactions(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const normalized: Record<string, string[]> = {};
  for (const [emoji, users] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(users)) {
      normalized[emoji] = users.filter((u): u is string => typeof u === "string");
    }
  }
  return normalized;
}

/**
 * Normalizes chat message objects from canonical ChatMessageDTO or legacy REST shapes.
 */
export function normalizeMessage(raw: any): ChatMessage {
  const senderUser = raw?.sender
    ? {
        id: raw.sender.id || raw.senderId || raw.sender_id || "anonymous",
        name: raw.sender.name || raw.senderName || raw.sender_name || "Learner",
        avatarUrl:
          raw.sender.avatarUrl ||
          raw.sender.avatar_url ||
          raw.senderAvatar ||
          raw.sender_avatar,
      }
    : {
        id: raw?.senderId || raw?.sender_id || "anonymous",
        name: raw?.senderName || raw?.sender_name || "Learner",
        avatarUrl: raw?.senderAvatar || raw?.sender_avatar,
      };

  const clientMessageId =
    typeof raw?.clientMessageId === "string" && raw.clientMessageId.length > 0
      ? raw.clientMessageId
      : typeof raw?.client_message_id === "string" &&
        raw.client_message_id.length > 0
      ? raw.client_message_id
      : undefined;

  const message: ChatMessage & { clientMessageId?: string } = {
    id: String(raw?.id || `msg_${Date.now()}`),
    ...(clientMessageId ? { clientMessageId } : {}),
    roomId: raw?.roomId || raw?.room_id || "",
    sender: senderUser,
    content: raw?.content || raw?.text || "",
    type: raw?.type || "TEXT",
    mediaUrl: raw?.mediaUrl || raw?.media_url,
    mediaType: raw?.mediaType || raw?.media_type,
    createdAt:
      raw?.createdAt ||
      raw?.created_at ||
      raw?.timestamp ||
      new Date().toISOString(),
    isHighlighted: !!(raw?.isHighlighted ?? raw?.is_highlighted),
    reactions: normalizeReactions(raw?.reactions),
  };

  return message;
}

