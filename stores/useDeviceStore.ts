import { create } from "zustand";
import { DeviceInfo } from "@/types";

interface DeviceState {
  audioInputId: string;
  audioOutputId: string;
  microphones: DeviceInfo[];
  speakers: DeviceInfo[];
  permissionStatus: "prompt" | "granted" | "denied";

  setAudioInputId: (id: string) => void;
  setAudioOutputId: (id: string) => void;
  setMicrophones: (mics: DeviceInfo[]) => void;
  setSpeakers: (speakers: DeviceInfo[]) => void;
  setPermissionStatus: (status: "prompt" | "granted" | "denied") => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  audioInputId: "default",
  audioOutputId: "default",
  microphones: [
    { deviceId: "default", label: "Default Microphone", kind: "audioinput" },
    { deviceId: "airpods-mic", label: "AirPods Pro Microphone (Bluetooth)", kind: "audioinput" },
    { deviceId: "built-in-mic", label: "Built-in Microphone (Realtek Audio)", kind: "audioinput" },
  ],
  speakers: [
    { deviceId: "default", label: "Default Speakers", kind: "audiooutput" },
    { deviceId: "airpods-out", label: "AirPods Pro Audio Out", kind: "audiooutput" },
    { deviceId: "built-in-spk", label: "Internal Laptop Speakers", kind: "audiooutput" },
  ],
  permissionStatus: "granted",

  setAudioInputId: (audioInputId) => set({ audioInputId }),
  setAudioOutputId: (audioOutputId) => set({ audioOutputId }),
  setMicrophones: (microphones) => set({ microphones }),
  setSpeakers: (speakers) => set({ speakers }),
  setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
}));
