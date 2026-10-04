import { create } from "zustand";
import { VoiceRoom, Participant, User } from "@/types";
import { useAuthStore } from "./useAuthStore";

interface RoomState {
  currentRoom: VoiceRoom | null;
  isJoining: boolean;
  isHost: boolean;
  setCurrentRoom: (room: VoiceRoom | null) => void;
  joinRoom: (room: VoiceRoom, user?: User | null) => void;
  leaveRoom: () => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  isJoining: false,
  isHost: false,

  setCurrentRoom: (currentRoom) => {
    const currentUserId = useAuthStore.getState().user?.id || "guest";
    set({
      currentRoom,
      isHost:
        currentRoom?.host.id === currentUserId ||
        (currentRoom?.participants.some((p) => p.id === currentUserId && p.isHost) ?? false),
    });
  },

  joinRoom: (room, currentUser) => {
    const user = currentUser !== undefined ? currentUser : useAuthStore.getState().user;
    const currentUserId = user?.id || "guest";
    const isHost =
      room.host.id === currentUserId ||
      room.participants.some((p) => p.id === currentUserId && p.isHost);

    let participants = [...room.participants];
    if (user && !participants.some((p) => p.id === user.id)) {
      const userParticipant: Participant = {
        ...user,
        isHost,
        isSpeaking: false,
        isMuted: false,
        isDeafened: false,
        handRaised: false,
      };
      // Place current user at front for stage preview
      participants = [userParticipant, ...participants];
    }

    set({
      currentRoom: {
        ...room,
        participants,
        currentSlots: Math.max(room.currentSlots, participants.length),
      },
      isHost,
      isJoining: false,
    });
  },

  leaveRoom: () =>
    set({
      currentRoom: null,
      isHost: false,
      isJoining: false,
    }),

  updateParticipant: (participantId, updates) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    const updatedParticipants = currentRoom.participants.map((p) =>
      p.id === participantId ? { ...p, ...updates } : p
    );

    set({
      currentRoom: {
        ...currentRoom,
        participants: updatedParticipants,
      },
    });
  },

  addParticipant: (participant) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    // Check if already added: if so, update their record
    if (currentRoom.participants.some((p) => p.id === participant.id)) {
      const updated = currentRoom.participants.map((p) =>
        p.id === participant.id ? { ...p, ...participant } : p
      );
      set({
        currentRoom: {
          ...currentRoom,
          participants: updated,
        },
      });
      return;
    }

    const updated = [...currentRoom.participants, participant];
    set({
      currentRoom: {
        ...currentRoom,
        participants: updated,
        currentSlots: updated.length,
      },
    });
  },

  removeParticipant: (participantId) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    const updated = currentRoom.participants.filter((p) => p.id !== participantId);
    set({
      currentRoom: {
        ...currentRoom,
        participants: updated,
        currentSlots: updated.length,
      },
    });
  },
}));
