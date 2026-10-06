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
  isLeaveConfirmOpen: boolean;
  pendingNavTab: string | null;

  setActiveTab: (tab: string) => void;
  openCreateModal: (initialTopic?: string) => void;
  closeCreateModal: () => void;
  setProfileOpen: (open: boolean) => void;
  setCalibrationOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
  openLeaveConfirm: (pendingTab?: string | null) => void;
  closeLeaveConfirm: () => void;
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
  isLeaveConfirmOpen: false,
  pendingNavTab: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  openCreateModal: (createInitialTopic = "") =>
    set({ isCreateOpen: true, createInitialTopic }),
  closeCreateModal: () => set({ isCreateOpen: false, createInitialTopic: "" }),
  setProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
  setCalibrationOpen: (isCalibrationOpen) => set({ isCalibrationOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  openAuthModal: (mode = "login") => set({ isAuthOpen: true, authMode: mode }),
  closeAuthModal: () => set({ isAuthOpen: false }),
  openLeaveConfirm: (pendingTab = null) =>
    set({ isLeaveConfirmOpen: true, pendingNavTab: pendingTab }),
  closeLeaveConfirm: () =>
    set({ isLeaveConfirmOpen: false, pendingNavTab: null }),
}));
