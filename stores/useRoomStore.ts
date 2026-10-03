import { create } from "zustand";
import { VoiceRoom, Participant } from "@/types";

interface RoomState {
  currentRoom: VoiceRoom | null;
  isJoining: boolean;
  isHost: boolean;
  setCurrentRoom: (room: VoiceRoom | null) => void;
  joinRoom: (room: VoiceRoom, currentUserId?: string) => void;
  leaveRoom: () => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  isJoining: false,
  isHost: false,

  setCurrentRoom: (currentRoom) =>
    set({
      currentRoom,
      isHost: currentRoom?.host.id === "user-alex-1" || currentRoom?.host.id === "p-1",
    }),

  joinRoom: (room, currentUserId = "p-1") =>
    set({
      currentRoom: room,
      isHost: room.host.id === currentUserId || room.participants.some((p) => p.id === currentUserId && p.isHost),
      isJoining: false,
    }),

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

    // check if already added
    if (currentRoom.participants.some((p) => p.id === participant.id)) return;

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
