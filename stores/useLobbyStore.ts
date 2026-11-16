import { create } from "zustand";
import { VoiceRoom } from "@/types";
import { Language } from "@/enums";
import {
  reduceMergeServerRooms,
  reduceApplyRoomCreated,
  reduceApplyRoomUpdated,
  reduceApplyRoomDeleted,
} from "@/lib/lobby-store-core.mjs";

export interface LiveStats {
  onlineCount: number;
  activeRoomsCount: number;
  liveLanguagesCount: number;
}

export interface LobbyState {
  // Normalized entity state
  roomsById: Record<string, VoiceRoom>;
  roomVersions: Record<string, number>;
  closedRooms: Record<string, boolean>;
  onlineCount: number | null;

  // Filter & search states
  searchQuery: string;
  selectedLanguage: Language;
  activeFilter: string | null;

  // Backwards-compatible selector accessors
  rooms: VoiceRoom[];
  liveStats: LiveStats;

  // Primary normalized mutation actions
  mergeServerRooms: (serverRooms: VoiceRoom[]) => void;
  applyRoomCreated: (room: VoiceRoom, version?: number) => void;
  applyRoomUpdated: (roomId: string, updates: Partial<VoiceRoom>, version?: number) => void;
  applyRoomDeleted: (roomId: string, version?: number) => void;
  setOnlineCount: (count: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedLanguage: (lang: Language) => void;
  setActiveFilter: (filter: string | null) => void;

  // Backwards-compatible method signatures
  setRooms: (rooms: VoiceRoom[]) => void;
  addRoom: (room: VoiceRoom) => void;
  updateRoom: (roomId: string, updates: Partial<VoiceRoom>) => void;
  removeRoom: (roomId: string) => void;
  setLiveStats: (stats: Partial<LiveStats>) => void;
}

export const INITIAL_ROOMS_DATA: VoiceRoom[] = [];

function computeLiveStats(rooms: VoiceRoom[], onlineCount: number | null): LiveStats {
  const uniqueLanguages = new Set<string>();
  rooms.forEach((r) => {
    if (r.language) uniqueLanguages.add(r.language);
  });
  return {
    onlineCount: onlineCount ?? 0,
    activeRoomsCount: rooms.length,
    liveLanguagesCount: uniqueLanguages.size,
  };
}

export const useLobbyStore = create<LobbyState>((set) => ({
  roomsById: {},
  roomVersions: {},
  closedRooms: {},
  onlineCount: null,
  searchQuery: "",
  selectedLanguage: Language.ALL,
  activeFilter: "active",
  rooms: INITIAL_ROOMS_DATA,
  liveStats: computeLiveStats(INITIAL_ROOMS_DATA, null),

  mergeServerRooms: (serverRooms: VoiceRoom[]) =>
    set((state) => {
      const reduced = reduceMergeServerRooms(state, serverRooms);
      return {
        ...reduced,
        liveStats: computeLiveStats(reduced.rooms, reduced.onlineCount),
      };
    }),

  applyRoomCreated: (room: VoiceRoom, version?: number) =>
    set((state) => {
      const reduced = reduceApplyRoomCreated(state, room, version);
      return {
        ...reduced,
        liveStats: computeLiveStats(reduced.rooms, reduced.onlineCount),
      };
    }),

  applyRoomUpdated: (roomId: string, updates: Partial<VoiceRoom>, version?: number) =>
    set((state) => {
      const reduced = reduceApplyRoomUpdated(state, roomId, updates, version);
      return {
        ...reduced,
        liveStats: computeLiveStats(reduced.rooms, reduced.onlineCount),
      };
    }),

  applyRoomDeleted: (roomId: string, version?: number) =>
    set((state) => {
      const reduced = reduceApplyRoomDeleted(state, roomId, version);
      return {
        ...reduced,
        liveStats: computeLiveStats(reduced.rooms, reduced.onlineCount),
      };
    }),

  setOnlineCount: (onlineCount: number | null) =>
    set((state) => ({
      onlineCount,
      liveStats: computeLiveStats(state.rooms, onlineCount),
    })),

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setSelectedLanguage: (selectedLanguage: Language) => set({ selectedLanguage }),
  setActiveFilter: (activeFilter: string | null) => set({ activeFilter }),

  // Backwards-compatible delegates
  setRooms: (rooms: VoiceRoom[]) =>
    set((state) => {
      const reduced = reduceMergeServerRooms(state, rooms);
      return {
        ...reduced,
        liveStats: computeLiveStats(reduced.rooms, reduced.onlineCount),
      };
    }),

  addRoom: (room: VoiceRoom) =>
    set((state) => {
      const reduced = reduceApplyRoomCreated(state, room);
      return {
        ...reduced,
        liveStats: computeLiveStats(reduced.rooms, reduced.onlineCount),
      };
    }),

  updateRoom: (roomId: string, updates: Partial<VoiceRoom>) =>
    set((state) => {
      const reduced = reduceApplyRoomUpdated(state, roomId, updates);
      return {
        ...reduced,
        liveStats: computeLiveStats(reduced.rooms, reduced.onlineCount),
      };
    }),

  removeRoom: (roomId: string) =>
    set((state) => {
      const reduced = reduceApplyRoomDeleted(state, roomId);
      return {
        ...reduced,
        liveStats: computeLiveStats(reduced.rooms, reduced.onlineCount),
      };
    }),

  setLiveStats: (stats: Partial<LiveStats>) =>
    set((state) => ({
      liveStats: {
        ...state.liveStats,
        ...stats,
      },
      onlineCount: stats.onlineCount !== undefined ? stats.onlineCount : state.onlineCount,
    })),
}));
