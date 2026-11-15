import { create } from "zustand";
import { User } from "@/types";
import { CEFRLevel } from "@/enums";
import { setPresenceAuthenticated } from "@/lib/presence/auth-events";

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

function getInitialAuthState(): { user: User; isAuthenticated: boolean; isGuest: boolean } {
  if (typeof window === "undefined") {
    return { user: DEFAULT_USER, isAuthenticated: false, isGuest: true };
  }
  try {
    const stored = localStorage.getItem("nimble_voice_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.isGuest) {
        return { user: parsed, isAuthenticated: true, isGuest: false };
      }
    }
    const sessionStored = sessionStorage.getItem("nimble_voice_guest");
    if (sessionStored) {
      const parsedGuest = JSON.parse(sessionStored);
      return { user: parsedGuest, isAuthenticated: false, isGuest: true };
    }
  } catch {}
  return { user: DEFAULT_USER, isAuthenticated: false, isGuest: true };
}

const initialAuth = getInitialAuthState();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  isAuthenticated: initialAuth.isAuthenticated,
  isGuest: initialAuth.isGuest,

  initUser: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("nimble_voice_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.isGuest) {
            set({ user: parsed, isAuthenticated: true, isGuest: false });
            setPresenceAuthenticated(true);
            return;
          }
        } catch {}
      }

      // Check tab-scoped session for guest
      let guestUser: User | null = null;
      const sessionStored = sessionStorage.getItem("nimble_voice_guest");
      if (sessionStored) {
        try {
          guestUser = JSON.parse(sessionStored);
        } catch {}
      }

      if (!guestUser) {
        // Generate clean unique guest learner session for this tab/window (userYYYYMMDDNNN)
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const randomSeq = Math.floor(100 + Math.random() * 900);
        const guestId = `user${yyyy}${mm}${dd}${randomSeq}`;
        guestUser = {
          ...DEFAULT_USER,
          id: guestId,
          name: `Guest #${randomSeq}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`,
        };
        sessionStorage.setItem("nimble_voice_guest", JSON.stringify(guestUser));
      }

      set({ user: guestUser, isAuthenticated: false, isGuest: true });

      // Check for token in sessionStorage, migrating from legacy localStorage if needed
      let token = sessionStorage.getItem("nimble_guest_token");
      if (!token) {
        const legacyToken = localStorage.getItem("token") || localStorage.getItem("nimble_auth_token");
        if (legacyToken) {
          token = legacyToken;
          sessionStorage.setItem("nimble_guest_token", legacyToken);
        }
      }

      if (token) {
        setPresenceAuthenticated(true);
        return;
      }

      // No token found anywhere for this session: register with Go backend
      import("@/lib/axios").then(({ apiClient }) => {
        import("@/constants/apiPaths").then(({ API_PATHS }) => {
          apiClient
            .post(API_PATHS.AUTH.GUEST_LOGIN, { name: guestUser!.name })
            .then((res: any) => {
              if (res?.token) {
                sessionStorage.setItem("nimble_guest_token", res.token);
                setPresenceAuthenticated(true);
                import("@/lib/socket").then(({ socketService }) => {
                  socketService.connect();
                });
              }
              if (res?.user) {
                import("@/lib/normalize").then(({ normalizeUser }) => {
                  set({
                    user: normalizeUser(res.user),
                    isAuthenticated: false,
                    isGuest: true,
                  });
                });
              }
            })
            .catch((err) => {
              console.warn("Guest login initialization failed:", err);
            });
        });
      });
    } catch {}
  },

  login: (user) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("nimble_voice_user", JSON.stringify(user));
        sessionStorage.removeItem("nimble_voice_guest");
      } catch {}
    }
    set({ user, isAuthenticated: true, isGuest: false });
    setPresenceAuthenticated(true);
  },

  logout: () => {
    import("@/lib/axios")
      .then(({ apiClient }) => apiClient.post("/api/auth/logout"))
      .catch(() => {});
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("nimble_voice_user");
        sessionStorage.removeItem("nimble_voice_guest");
        localStorage.removeItem("token");
        localStorage.removeItem("nimble_auth_token");
      } catch {}
    }
    set({ user: null, isAuthenticated: false, isGuest: false });
    setPresenceAuthenticated(false);
  },

  setGuestUser: (name = "Guest Learner") => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const guestId = `user${yyyy}${mm}${dd}${randomSeq}`;
    const guestUser: User = {
      id: guestId,
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
        sessionStorage.setItem("nimble_voice_guest", JSON.stringify(guestUser));
      } catch {}
    }
    set({
      user: guestUser,
      isAuthenticated: true,
      isGuest: true,
    });
    setPresenceAuthenticated(Boolean(sessionStorage.getItem("nimble_guest_token") || localStorage.getItem("token") || localStorage.getItem("nimble_auth_token")));
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
