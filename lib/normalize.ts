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
 * Normalizes participant objects.
 */
export function normalizeParticipant(raw: any): Participant {
  const baseUser = normalizeUser(raw.user || raw);
  return {
    ...baseUser,
    id: raw.id || raw.userId || raw.user_id || baseUser.id,
    isHost: !!(raw.isHost ?? raw.is_host),
    isSpeaking: !!(raw.isSpeaking ?? raw.is_speaking),
    isMuted: !!(raw.isMuted ?? raw.is_muted),
    isDeafened: !!(raw.isDeafened ?? raw.is_deafened),
    handRaised: !!(raw.handRaised ?? raw.hand_raised),
    audioLevel: raw.audioLevel ?? raw.audio_level ?? 0,
    peerId: raw.peerId ?? raw.peer_id ?? raw.socketId ?? raw.socket_id,
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
 * Normalizes chat message objects.
 */
export function normalizeMessage(raw: any): ChatMessage {
  const senderUser = raw.sender || {
    id: raw.senderId || raw.sender_id || "anonymous",
    name: raw.senderName || raw.sender_name || "Learner",
    avatarUrl: raw.senderAvatar || raw.sender_avatar,
  };

  return {
    id: String(raw.id || `msg_${Date.now()}`),
    roomId: raw.roomId || raw.room_id || "",
    sender: senderUser,
    content: raw.content || raw.text || "",
    type: raw.type || "TEXT",
    createdAt: raw.timestamp || raw.created_at || raw.createdAt || new Date().toISOString(),
    isHighlighted: !!(raw.isHighlighted ?? raw.is_highlighted),
    reactions: raw.reactions || {},
  };
}

