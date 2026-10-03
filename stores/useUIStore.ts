import { create } from "zustand";

interface UIState {
  activeTab: string;
  isCreateOpen: boolean;
  createInitialTopic: string;
  isProfileOpen: boolean;
  isCalibrationOpen: boolean;
  isSettingsOpen: boolean;

  setActiveTab: (tab: string) => void;
  openCreateModal: (initialTopic?: string) => void;
  closeCreateModal: () => void;
  setProfileOpen: (open: boolean) => void;
  setCalibrationOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "rooms",
  isCreateOpen: false,
  createInitialTopic: "",
  isProfileOpen: false,
  isCalibrationOpen: false,
  isSettingsOpen: false,

  setActiveTab: (activeTab) => set({ activeTab }),
  openCreateModal: (createInitialTopic = "") =>
    set({ isCreateOpen: true, createInitialTopic }),
  closeCreateModal: () => set({ isCreateOpen: false, createInitialTopic: "" }),
  setProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
  setCalibrationOpen: (isCalibrationOpen) => set({ isCalibrationOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
}));
