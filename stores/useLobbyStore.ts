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

export const INITIAL_ROOMS_DATA: VoiceRoom[] = [];

function calculateStats(rooms: VoiceRoom[], onlineCount = 0): LiveStats {
  const uniqueLanguages = new Set<string>();
  rooms.forEach((r) => {
    if (r.language) uniqueLanguages.add(r.language);
  });
  return {
    onlineCount: Math.max(0, onlineCount),
    activeRoomsCount: rooms.length,
    liveLanguagesCount: uniqueLanguages.size,
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
