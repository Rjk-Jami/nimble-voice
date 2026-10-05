import { create } from "zustand";

interface UIState {
  activeTab: string;
  isCreateOpen: boolean;
  createInitialTopic: string;
  isProfileOpen: boolean;
  isCalibrationOpen: boolean;
  isSettingsOpen: boolean;
  isAuthOpen: boolean;
  authMode: "login" | "register";

  setActiveTab: (tab: string) => void;
  openCreateModal: (initialTopic?: string) => void;
  closeCreateModal: () => void;
  setProfileOpen: (open: boolean) => void;
  setCalibrationOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "rooms",
  isCreateOpen: false,
  createInitialTopic: "",
  isProfileOpen: false,
  isCalibrationOpen: false,
  isSettingsOpen: false,
  isAuthOpen: false,
  authMode: "login",

  setActiveTab: (activeTab) => set({ activeTab }),
  openCreateModal: (createInitialTopic = "") =>
    set({ isCreateOpen: true, createInitialTopic }),
  closeCreateModal: () => set({ isCreateOpen: false, createInitialTopic: "" }),
  setProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
  setCalibrationOpen: (isCalibrationOpen) => set({ isCalibrationOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  openAuthModal: (mode = "login") => set({ isAuthOpen: true, authMode: mode }),
  closeAuthModal: () => set({ isAuthOpen: false }),
}));
