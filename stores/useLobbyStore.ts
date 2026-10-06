import { create } from "zustand";
import { VoiceRoom } from "@/types";
import { Language, CEFRLevel, RoomStatus } from "@/enums";

interface LiveStats {
  onlineCount: number;
  activeRoomsCount: number;
  liveLanguagesCount: number;
}

interface LobbyState {
  rooms: VoiceRoom[];
  searchQuery: string;
  selectedLanguage: Language;
  activeFilter: string | null;
  liveStats: LiveStats;
  setRooms: (rooms: VoiceRoom[]) => void;
  addRoom: (room: VoiceRoom) => void;
  updateRoom: (roomId: string, updates: Partial<VoiceRoom>) => void;
  removeRoom: (roomId: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedLanguage: (lang: Language) => void;
  setActiveFilter: (filter: string | null) => void;
  setLiveStats: (stats: Partial<LiveStats>) => void;
}

export const INITIAL_ROOMS_DATA: VoiceRoom[] = [
  {
    id: "room-english-lounge",
    title: "Global English Lounge: Casual chat, culture & daily life",
    topic: "Casual chat, culture & daily life",
    language: Language.ENGLISH,
    flag: "🇬🇧",
    cefrLevel: CEFRLevel.B1,
    levelLabel: "Intermediate B1",
    maxSlots: 6,
    currentSlots: 0,
    tags: ["Casual & Life", "Culture"],
    status: RoomStatus.LIVE,
    startedAt: new Date().toISOString(),
    activeSinceMinutes: 1,
    hasFreeSeats: true,
    isBeginnerFriendly: true,
    hasNativeSpeaker: false,
    isLive: true,
    host: {
      id: "host-community",
      name: "Nimble Community Host",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      location: "Global",
      nativeLanguage: "English",
      learningLanguage: "Spanish",
      isVerified: true,
      cefrPortfolio: { English: CEFRLevel.NATIVE },
      karma: 500,
      hoursSpoken: 120,
      streak: 45,
    },
    participants: [],
    messages: [],
  },
  {
    id: "room-spanish-corner",
    title: "Spanish Practice Corner: Saludos, viajes y vida cotidiana",
    topic: "Saludos, viajes y vida cotidiana",
    language: Language.SPANISH,
    flag: "🇪🇸",
    cefrLevel: CEFRLevel.A2,
    levelLabel: "Beginner A2",
    maxSlots: 5,
    currentSlots: 0,
    tags: ["Grammar & Vocab", "Beginners"],
    status: RoomStatus.LIVE,
    startedAt: new Date().toISOString(),
    activeSinceMinutes: 1,
    hasFreeSeats: true,
    isBeginnerFriendly: true,
    hasNativeSpeaker: false,
    isLive: true,
    host: {
      id: "host-elena",
      name: "Elena Moderadora",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      location: "Madrid, ES",
      nativeLanguage: "Spanish",
      learningLanguage: "English",
      isVerified: true,
      cefrPortfolio: { Spanish: CEFRLevel.NATIVE },
      karma: 420,
      hoursSpoken: 95,
      streak: 32,
    },
    participants: [],
    messages: [],
  },
];

function calculateStats(rooms: VoiceRoom[], onlineCount = 1): LiveStats {
  const uniqueLanguages = new Set<string>();
  rooms.forEach((r) => {
    if (r.language) uniqueLanguages.add(r.language);
  });
  return {
    onlineCount: Math.max(1, onlineCount),
    activeRoomsCount: rooms.length,
    liveLanguagesCount: Math.max(1, uniqueLanguages.size),
  };
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  rooms: INITIAL_ROOMS_DATA,
  searchQuery: "",
  selectedLanguage: Language.ALL,
  activeFilter: "active",
  liveStats: calculateStats(INITIAL_ROOMS_DATA, 1),

  setRooms: (rooms) =>
    set((state) => ({
      rooms,
      liveStats: calculateStats(rooms, state.liveStats.onlineCount),
    })),

  addRoom: (room) =>
    set((state) => {
      const updated = [room, ...state.rooms.filter((r) => r.id !== room.id)];
      return {
        rooms: updated,
        liveStats: calculateStats(updated, state.liveStats.onlineCount),
      };
    }),

  updateRoom: (roomId, updates) =>
    set((state) => {
      const updated = state.rooms.map((r) =>
        r.id === roomId ? { ...r, ...updates } : r
      );
      return {
        rooms: updated,
        liveStats: calculateStats(updated, state.liveStats.onlineCount),
      };
    }),

  removeRoom: (roomId) =>
    set((state) => {
      const updated = state.rooms.filter((r) => r.id !== roomId);
      return {
        rooms: updated,
        liveStats: calculateStats(updated, state.liveStats.onlineCount),
      };
    }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),

  setLiveStats: (stats) =>
    set((state) => ({
      liveStats: {
        ...state.liveStats,
        ...stats,
      },
    })),
}));
