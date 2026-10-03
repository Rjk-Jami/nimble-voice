import { Language, CEFRLevel, RoomStatus } from "@/enums";
import { User } from "./user";
import { ChatMessage } from "./message";

export interface Participant extends User {
  isHost: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  handRaised: boolean;
  stream?: MediaStream;
  peerId?: string;
  audioLevel?: number; // 0 - 100
}

export interface VoiceRoom {
  id: string;
  title: string;
  topic: string;
  language: Language;
  flag: string;
  cefrLevel: CEFRLevel;
  levelLabel: string;
  maxSlots: number;
  currentSlots: number;
  host: User;
  participants: Participant[];
  tags: string[];
  status: RoomStatus;
  startedAt: string;
  activeSinceMinutes: number;
  hasFreeSeats: boolean;
  isBeginnerFriendly: boolean;
  hasNativeSpeaker: boolean;
  isLive: boolean;
  messages: ChatMessage[];
}

export interface RoomFilters {
  language: Language;
  searchQuery: string;
  filterType: "all" | "active" | "free-seats" | "beginner" | "native";
}
