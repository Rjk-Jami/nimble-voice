import { create } from "zustand";
import { VoiceRoom, ChatMessage, INITIAL_ROOMS } from "./data";

interface AppState {
  // Rooms & Session
  rooms: VoiceRoom[];
  activeRoom: VoiceRoom | null;
  activeTab: string;
  searchQuery: string;
  selectedLanguage: string;
  activeFilter: string | null;

  // Modals
  isCreateOpen: boolean;
  createInitialTopic: string;
  isProfileOpen: boolean;
  isCalibrationOpen: boolean;
  isSettingsOpen: boolean;

  // In-Call Tactical Audio
  isMuted: boolean;
  isDeafened: boolean;
  isSharingScreen: boolean;
  hasRaisedHand: boolean;
  activeAudioDevice: string;

  // Actions
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedLanguage: (lang: string) => void;
  setActiveFilter: (filter: string | null) => void;

  joinRoom: (room: VoiceRoom) => void;
  leaveRoom: () => void;
  createRoom: (room: VoiceRoom) => void;
  sendChatMessage: (text: string) => void;
  sendReaction: (emoji: string) => void;

  // Modal actions
  openCreateModal: (initialTopic?: string) => void;
  closeCreateModal: () => void;
  setProfileOpen: (open: boolean) => void;
  setCalibrationOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  // Tactical actions
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleScreenShare: () => void;
  toggleRaiseHand: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  rooms: INITIAL_ROOMS,
  activeRoom: null,
  activeTab: "rooms",
  searchQuery: "",
  selectedLanguage: "all",
  activeFilter: "active",

  isCreateOpen: false,
  createInitialTopic: "",
  isProfileOpen: false,
  isCalibrationOpen: false,
  isSettingsOpen: false,

  isMuted: false,
  isDeafened: false,
  isSharingScreen: false,
  hasRaisedHand: false,
  activeAudioDevice: "AirPods Pro (Alex)",

  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),

  joinRoom: (room) => set({ activeRoom: room }),
  leaveRoom: () => set({ activeRoom: null }),

  createRoom: (newRoom) =>
    set((state) => ({
      rooms: [newRoom, ...state.rooms],
      activeRoom: newRoom,
      activeTab: "rooms",
      isCreateOpen: false,
    })),

  sendChatMessage: (text) => {
    const { activeRoom } = get();
    if (!activeRoom || !text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "Alex Miller",
      senderId: "p-1",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isHost: true,
    };

    const updatedRoom: VoiceRoom = {
      ...activeRoom,
      messages: [...activeRoom.messages, newMsg],
    };

    set((state) => ({
      activeRoom: updatedRoom,
      rooms: state.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
    }));
  },

  sendReaction: (emoji) => {
    const { activeRoom } = get();
    if (!activeRoom) return;

    const reactionMsg: ChatMessage = {
      id: `reaction-${Date.now()}`,
      sender: "Alex Miller",
      text: `${emoji} reacted`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedRoom: VoiceRoom = {
      ...activeRoom,
      messages: [...activeRoom.messages, reactionMsg],
    };

    set((state) => ({
      activeRoom: updatedRoom,
      rooms: state.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
    }));
  },

  openCreateModal: (createInitialTopic = "") =>
    set({ isCreateOpen: true, createInitialTopic }),
  closeCreateModal: () => set({ isCreateOpen: false, createInitialTopic: "" }),
  setProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
  setCalibrationOpen: (isCalibrationOpen) => set({ isCalibrationOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

  toggleMute: () =>
    set((state) => {
      const newMuted = !state.isMuted;
      if (!state.activeRoom) return { isMuted: newMuted };

      const updatedParticipants = state.activeRoom.participants.map((p) =>
        p.isHost ? { ...p, isMuted: newMuted, isSpeaking: newMuted ? false : p.isSpeaking } : p
      );
      const updatedRoom = { ...state.activeRoom, participants: updatedParticipants };

      return {
        isMuted: newMuted,
        activeRoom: updatedRoom,
        rooms: state.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
      };
    }),

  toggleDeafen: () => set((state) => ({ isDeafened: !state.isDeafened })),
  toggleScreenShare: () => set((state) => ({ isSharingScreen: !state.isSharingScreen })),
  toggleRaiseHand: () =>
    set((state) => {
      const newHand = !state.hasRaisedHand;
      if (newHand && state.activeRoom) {
        const handMsg: ChatMessage = {
          id: `hand-${Date.now()}`,
          sender: "Alex Miller",
          text: "✋ Raised hand to speak next",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        const updatedRoom = {
          ...state.activeRoom,
          messages: [...state.activeRoom.messages, handMsg],
        };
        return {
          hasRaisedHand: newHand,
          activeRoom: updatedRoom,
          rooms: state.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
        };
      }
      return { hasRaisedHand: newHand };
    }),
}));
