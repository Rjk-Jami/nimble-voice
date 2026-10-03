import { create } from "zustand";
import { User } from "@/types";
import { CEFRLevel } from "@/enums";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (user: User) => void;
  logout: () => void;
  setGuestUser: (name?: string) => void;
  updateProfile: (updates: Partial<User>) => void;
}

const DEFAULT_USER: User = {
  id: "user-alex-1",
  name: "Alex Miller",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  location: "San Francisco, CA",
  nativeLanguage: "English",
  learningLanguage: "Spanish",
  isVerified: true,
  cefrPortfolio: {
    English: CEFRLevel.NATIVE,
    Spanish: CEFRLevel.B1,
    Japanese: CEFRLevel.A2,
  },
  karma: 142,
  hoursSpoken: 38.5,
  streak: 18,
  isGuest: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEFAULT_USER,
  isAuthenticated: true,
  isGuest: false,

  login: (user) => set({ user, isAuthenticated: true, isGuest: false }),
  logout: () => set({ user: null, isAuthenticated: false, isGuest: false }),
  setGuestUser: (name = "Guest Learner") =>
    set({
      user: {
        id: `guest-${Date.now()}`,
        name,
        nativeLanguage: "English",
        learningLanguage: "Spanish",
        isVerified: false,
        cefrPortfolio: { English: CEFRLevel.NATIVE },
        karma: 0,
        hoursSpoken: 0,
        streak: 1,
        isGuest: true,
      },
      isAuthenticated: true,
      isGuest: true,
    }),
  updateProfile: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
