"use client";

import { useFetch } from "./useFetch";
import { API_PATHS } from "@/lib/apiPaths";
import { VoiceRoom, ChatMessage, User, UserStats } from "@/types";
import { CreateRoomInput, UserProfileInput } from "@/schemas";
import { apiClient } from "@/lib/axios";
import { normalizeRoom, normalizeMessage, normalizeUser } from "@/lib/normalize";
import { toast } from "sonner";

/**
 * 1. Rooms Catalog Hook
 * Used by: LobbyView, Navbar search, Quick filters
 */
export function useRoomsApi(params: {
  lang?: string;
  query?: string;
  filter?: string;
  page?: number;
  limit?: number;
} = {}) {
  const queryParams = {
    ...(params.lang && params.lang !== "all" && { lang: params.lang }),
    ...(params.query && { query: params.query }),
    ...(params.filter && params.filter !== "all" && { filter: params.filter }),
    page: params.page || 1,
    limit: params.limit || 20,
  };

  const fetchResult = useFetch<VoiceRoom>(
    {
      listUrl: API_PATHS.ROOMS.LIST,
      createUrl: API_PATHS.ROOMS.CREATE,
      deleteUrlBase: API_PATHS.ROOMS.LIST,
      entityName: "Room",
      dataExtractor: (raw) => {
        const list = raw?.rooms || (Array.isArray(raw) ? raw : []);
        return list.map(normalizeRoom);
      },
    },
    queryParams,
    {
      refreshInterval: 12000, // Background refresh active rooms catalog
    }
  );

  return {
    rooms: fetchResult.data,
    totalCount: fetchResult.totalCount,
    pagination: fetchResult.pagination,
    isLoading: fetchResult.isLoading,
    error: fetchResult.error,
    refreshRooms: fetchResult.mutate,
    createRoom: async (input: CreateRoomInput) => {
      const res = await fetchResult.create(input);
      return res;
    },
    deleteRoom: (roomId: string) => fetchResult.remove(roomId),
  };
}

/**
 * 2. Room Detail & Session Actions Hook
 * Used by: LiveVoiceRoom, Join modals
 */
export function useRoomDetailApi(roomId: string | null | undefined) {
  const fetchResult = useFetch<VoiceRoom>(
    {
      detailUrl: roomId ? API_PATHS.ROOMS.DETAIL(roomId) : undefined,
      entityName: "Room Detail",
    },
    roomId ? {} : null
  );

  const joinRoom = async (password?: string) => {
    if (!roomId) return null;
    try {
      const res: any = await apiClient.post(API_PATHS.ROOMS.JOIN(roomId), { password });
      toast.success("Joined room successfully");
      return res;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Could not join room. It may be full.");
      return null;
    }
  };

  const leaveRoom = async () => {
    if (!roomId) return null;
    try {
      const res: any = await apiClient.post(API_PATHS.ROOMS.LEAVE(roomId));
      return res;
    } catch (err: any) {
      return null;
    }
  };

  return {
    room: fetchResult.singleData ? normalizeRoom(fetchResult.singleData) : null,
    isLoading: fetchResult.isLoading,
    error: fetchResult.error,
    refreshRoom: fetchResult.mutate,
    joinRoom,
    leaveRoom,
  };
}

/**
 * 3. In-Room Chat Messages Hook
 * Used by: LiveVoiceRoom chat backchannel drawer
 */
export function useRoomMessagesApi(roomId: string | null | undefined, limit = 50) {
  const fetchResult = useFetch<ChatMessage>(
    {
      listUrl: roomId ? API_PATHS.MESSAGES.LIST(roomId) : undefined,
      createUrl: roomId ? API_PATHS.MESSAGES.SEND(roomId) : undefined,
      entityName: "Message",
      dataExtractor: (raw) => {
        const list = raw?.messages || (Array.isArray(raw) ? raw : []);
        return list.map(normalizeMessage);
      },
    },
    roomId ? { limit } : null,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  const sendMessage = async (content: string, type: string = "TEXT") => {
    if (!content.trim()) return null;
    return await fetchResult.create({ content: content.trim(), type }, false, false);
  };

  return {
    messages: fetchResult.data,
    isLoading: fetchResult.isLoading,
    error: fetchResult.error,
    refreshMessages: fetchResult.mutate,
    sendMessage,
  };
}

/**
 * 4. User Profile & Portfolio Hook
 * Used by: ProfileModal, SettingsModal, Learner cards
 */
export function useUserProfileApi(userId?: string) {
  const fetchResult = useFetch<User>(
    {
      detailUrl: userId ? API_PATHS.USERS.DETAIL(userId) : API_PATHS.AUTH.PROFILE,
      updateUrlBase: API_PATHS.USERS.UPDATE_PORTFOLIO,
      entityName: "Profile",
    },
    {}
  );

  const updatePortfolio = async (input: Partial<UserProfileInput>) => {
    try {
      const res: any = await apiClient.patch(API_PATHS.USERS.UPDATE_PORTFOLIO, input);
      toast.success("Profile updated successfully");
      await fetchResult.mutate();
      return res;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update profile");
      return null;
    }
  };

  return {
    profile: fetchResult.singleData ? normalizeUser(fetchResult.singleData) : null,
    isLoading: fetchResult.isLoading,
    error: fetchResult.error,
    refreshProfile: fetchResult.mutate,
    updatePortfolio,
  };
}

/**
 * 5. Platform Telemetry & Live Stats Hook
 * Used by: LobbyView top ticker, Navbar badge
 */
export function useNetworkStatsApi() {
  const fetchResult = useFetch<{
    onlineCount: number;
    activeRoomsCount: number;
    liveLanguagesCount: number;
  }>(
    {
      detailUrl: API_PATHS.NETWORK.STATS,
      entityName: "Network Stats",
    },
    {},
    {
      refreshInterval: 15000, // Auto poll global stats every 15s
      revalidateOnFocus: false,
    }
  );

  return {
    stats: fetchResult.singleData || {
      onlineCount: 1420,
      activeRoomsCount: 68,
      liveLanguagesCount: 14,
    },
    isLoading: fetchResult.isLoading,
    refreshStats: fetchResult.mutate,
  };
}

/**
 * 6. Topics & Icebreaker Prompts Hook
 * Used by: TopicsView, In-room Topic Prompts Drawer
 */
export function useTopicPromptsApi(category?: string) {
  const fetchResult = useFetch<{
    category: string;
    icon: string;
    prompts: { title: string; level: string; tag: string }[];
  }>(
    {
      listUrl: API_PATHS.TOPICS.PROMPTS,
      entityName: "Topic Prompts",
    },
    category ? { category } : {}
  );

  return {
    decks: fetchResult.data,
    isLoading: fetchResult.isLoading,
    error: fetchResult.error,
    refreshPrompts: fetchResult.mutate,
  };
}

/**
 * 7. Authentication & Session Hook
 * Supports: Guest Login, Email/Password Login, Registration, Session Check
 */
export function useAuthApi() {
  const fetchResult = useFetch<{ authenticated: boolean; user: User | null }>(
    {
      detailUrl: API_PATHS.AUTH.SESSION,
      entityName: "Auth Session",
    },
    {}
  );

  const saveToken = (token: string) => {
    if (typeof window !== "undefined" && token) {
      localStorage.setItem("token", token);
      localStorage.setItem("nimble_auth_token", token);
    }
  };

  // Instant Guest Login
  const guestLogin = async (name?: string, nativeLanguage?: string, learningLanguage?: string) => {
    try {
      const res: any = await apiClient.post(API_PATHS.AUTH.GUEST_LOGIN, {
        name,
        nativeLanguage,
        learningLanguage,
      });

      if (res?.token) {
        saveToken(res.token);
      }

      toast.success("Guest session active");
      await fetchResult.mutate();
      return res;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to initialize guest session");
      return null;
    }
  };

  // Standard Email Login (Endpoint 5 in Go Backend)
  const login = async (email: string, password: string) => {
    try {
      const res: any = await apiClient.post("/api/auth/login", { email, password });
      if (res?.token) {
        saveToken(res.token);
      }
      toast.success("Logged in successfully");
      await fetchResult.mutate();
      return res;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Login failed");
      return null;
    }
  };

  // Registration (Endpoint 4 in Go Backend)
  const register = async (name: string, email: string, password: string) => {
    try {
      const res: any = await apiClient.post("/api/auth/register", { name, email, password });
      if (res?.token) {
        saveToken(res.token);
      }
      toast.success("Registration successful");
      await fetchResult.mutate();
      return res;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Registration failed");
      return null;
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("nimble_auth_token");
    }
    toast.info("Logged out");
    fetchResult.mutate({ authenticated: false, user: null } as any, false);
  };


  return {
    session: fetchResult.singleData,
    user: fetchResult.singleData?.user ? normalizeUser(fetchResult.singleData.user) : null,
    isAuthenticated: !!fetchResult.singleData?.authenticated,
    isLoading: fetchResult.isLoading,
    guestLogin,
    login,
    register,
    logout,
    refreshSession: fetchResult.mutate,
  };
}
