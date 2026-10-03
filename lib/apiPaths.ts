/**
 * Centralized API Paths for SWR data fetching and backend routing
 */
export const API_PATHS = {
  AUTH: {
    SESSION: "/api/auth/session",
    GUEST_LOGIN: "/api/auth/guest",
    PROFILE: "/api/auth/profile",
  },
  ROOMS: {
    LIST: "/api/rooms",
    DETAIL: (roomId: string) => `/api/rooms/${roomId}`,
    CREATE: "/api/rooms",
    JOIN: (roomId: string) => `/api/rooms/${roomId}/join`,
    LEAVE: (roomId: string) => `/api/rooms/${roomId}/leave`,
    PARTICIPANTS: (roomId: string) => `/api/rooms/${roomId}/participants`,
  },
  MESSAGES: {
    LIST: (roomId: string) => `/api/rooms/${roomId}/messages`,
    SEND: (roomId: string) => `/api/rooms/${roomId}/messages`,
  },
  USERS: {
    DETAIL: (userId: string) => `/api/users/${userId}`,
    UPDATE_PORTFOLIO: "/api/users/portfolio",
    STATS: "/api/users/stats",
  },
  TOPICS: {
    LIST: "/api/topics",
    PROMPTS: "/api/topics/prompts",
  },
  NETWORK: {
    STATS: "/api/stats/network",
  },
} as const;

export type ApiPaths = typeof API_PATHS;
