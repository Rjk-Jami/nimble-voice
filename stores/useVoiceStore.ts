import { create } from "zustand";

interface VoiceState {
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  localStream: MediaStream | null;
  networkLatency: number;
  speakingMap: Record<string, boolean>;
  audioLevels: Record<string, number>;

  // Actions
  toggleMute: () => void;
  setMuted: (isMuted: boolean) => void;
  toggleDeafen: () => void;
  setDeafened: (isDeafened: boolean) => void;
  toggleScreenShare: () => void;
  setScreenSharing: (isScreenSharing: boolean) => void;
  toggleHandRaised: () => void;
  setHandRaised: (handRaised: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setNetworkLatency: (latency: number) => void;
  setSpeaking: (participantId: string, isSpeaking: boolean) => void;
  setAudioLevel: (participantId: string, level: number) => void;
  resetVoiceState: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isMuted: false,
  isDeafened: false,
  isScreenSharing: false,
  handRaised: false,
  localStream: null,
  networkLatency: 24, // 24ms mesh
  speakingMap: {},
  audioLevels: {},

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setMuted: (isMuted) => set({ isMuted }),
  toggleDeafen: () => set((state) => ({ isDeafened: !state.isDeafened })),
  setDeafened: (isDeafened) => set({ isDeafened }),
  toggleScreenShare: () => set((state) => ({ isScreenSharing: !state.isScreenSharing })),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  toggleHandRaised: () => set((state) => ({ handRaised: !state.handRaised })),
  setHandRaised: (handRaised) => set({ handRaised }),
  setLocalStream: (localStream) => set({ localStream }),
  setNetworkLatency: (networkLatency) => set({ networkLatency }),

  setSpeaking: (participantId, isSpeaking) =>
    set((state) => ({
      speakingMap: { ...state.speakingMap, [participantId]: isSpeaking },
    })),

  setAudioLevel: (participantId, level) =>
    set((state) => ({
      audioLevels: { ...state.audioLevels, [participantId]: level },
    })),

  resetVoiceState: () =>
    set({
      isMuted: false,
      isDeafened: false,
      isScreenSharing: false,
      handRaised: false,
      localStream: null,
      speakingMap: {},
      audioLevels: {},
    }),
}));
