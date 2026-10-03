import { create } from "zustand";
import { VoiceMode, AudioQuality } from "@/enums";

interface SettingsState {
  voiceMode: VoiceMode;
  audioQuality: AudioQuality;
  joinLeaveSounds: boolean;
  directInvites: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;

  setVoiceMode: (mode: VoiceMode) => void;
  setAudioQuality: (quality: AudioQuality) => void;
  setJoinLeaveSounds: (enabled: boolean) => void;
  setDirectInvites: (enabled: boolean) => void;
  setNoiseSuppression: (enabled: boolean) => void;
  setEchoCancellation: (enabled: boolean) => void;
  setAutoGainControl: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  voiceMode: VoiceMode.VAD,
  audioQuality: AudioQuality.HIGH_FIDELITY,
  joinLeaveSounds: true,
  directInvites: true,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,

  setVoiceMode: (voiceMode) => set({ voiceMode }),
  setAudioQuality: (audioQuality) => set({ audioQuality }),
  setJoinLeaveSounds: (joinLeaveSounds) => set({ joinLeaveSounds }),
  setDirectInvites: (directInvites) => set({ directInvites }),
  setNoiseSuppression: (noiseSuppression) => set({ noiseSuppression }),
  setEchoCancellation: (echoCancellation) => set({ echoCancellation }),
  setAutoGainControl: (autoGainControl) => set({ autoGainControl }),
}));
