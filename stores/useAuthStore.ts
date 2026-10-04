import { create } from "zustand";
import { User } from "@/types";
import { CEFRLevel } from "@/enums";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  initUser: () => void;
  login: (user: User) => void;
  logout: () => void;
  setGuestUser: (name?: string) => void;
  updateProfile: (updates: Partial<User>) => void;
  incrementCallTime: (seconds: number) => void;
  incrementRoomsJoined: () => void;
}

const DEFAULT_USER: User = {
  id: "guest-learner",
  name: "Guest Learner",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  location: "Global",
  nativeLanguage: "English",
  learningLanguage: "Spanish",
  isVerified: false,
  cefrPortfolio: {},
  karma: 0,
  hoursSpoken: 0,
  streak: 1,
  totalRoomsJoined: 0,
  frequentPartnersCount: 0,
  isGuest: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEFAULT_USER,
  isAuthenticated: false,
  isGuest: true,

  initUser: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("nimble_voice_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.isGuest) {
          set({ user: parsed, isAuthenticated: true, isGuest: false });
          return;
        }
      }

      // Check tab-scoped session for guest
      const sessionStored = sessionStorage.getItem("nimble_voice_guest");
      if (sessionStored) {
        const parsedGuest = JSON.parse(sessionStored);
        set({ user: parsedGuest, isAuthenticated: false, isGuest: true });
        return;
      }

      // Generate clean unique guest learner session for this tab/window
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const guestUser: User = {
        ...DEFAULT_USER,
        id: `guest-${randomSuffix.toLowerCase()}`,
        name: `Guest #${randomSuffix}`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSuffix}`,
      };
      sessionStorage.setItem("nimble_voice_guest", JSON.stringify(guestUser));
      set({ user: guestUser, isAuthenticated: false, isGuest: true });
    } catch {}
  },

  login: (user) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("nimble_voice_user", JSON.stringify(user));
      } catch {}
    }
    set({ user, isAuthenticated: true, isGuest: false });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("nimble_voice_user");
      } catch {}
    }
    set({ user: null, isAuthenticated: false, isGuest: false });
  },

  setGuestUser: (name = "Guest Learner") => {
    const guestUser: User = {
      id: `guest-${Date.now()}`,
      name,
      nativeLanguage: "English",
      learningLanguage: "Spanish",
      isVerified: false,
      cefrPortfolio: { English: CEFRLevel.NATIVE },
      karma: 0,
      hoursSpoken: 0,
      streak: 1,
      totalRoomsJoined: 1,
      frequentPartnersCount: 0,
      isGuest: true,
    };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("nimble_voice_user", JSON.stringify(guestUser));
      } catch {}
    }
    set({
      user: guestUser,
      isAuthenticated: true,
      isGuest: true,
    });
  },

  updateProfile: (updates) =>
    set((state) => {
      if (!state.user) return { user: null };
      const updated = { ...state.user, ...updates };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("nimble_voice_user", JSON.stringify(updated));
        } catch {}
      }
      return { user: updated };
    }),

  incrementCallTime: (seconds) =>
    set((state) => {
      if (!state.user) return { user: null };
      const addedHours = Number((seconds / 3600).toFixed(2));
      const updated = {
        ...state.user,
        hoursSpoken: Number((state.user.hoursSpoken + addedHours).toFixed(1)),
        karma: state.user.karma + Math.floor(seconds / 60),
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("nimble_voice_user", JSON.stringify(updated));
        } catch {}
      }
      return { user: updated };
    }),

  incrementRoomsJoined: () =>
    set((state) => {
      if (!state.user) return { user: null };
      const updated = {
        ...state.user,
        totalRoomsJoined: (state.user.totalRoomsJoined || 0) + 1,
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("nimble_voice_user", JSON.stringify(updated));
        } catch {}
      }
      return { user: updated };
    }),
}));
