/**
 * NimbleVoice — Centralized API Paths
 * Single Source of Truth for all frontend REST API routes.
 * Modifying this file updates endpoint paths across the entire project.
 */

export const API_PATHS = {
  // 1. Authentication & Identity
  AUTH: {
    GUEST_LOGIN: "/api/auth/guest",
    SESSION: "/api/auth/session",
    PROFILE: "/api/auth/profile",
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
  },

  // 2. Voice Rooms CRUD & Lifecycle
  ROOMS: {
    LIST: "/api/rooms",
    CREATE: "/api/rooms",
    DETAIL: (roomId: string) => `/api/rooms/${roomId}`,
    UPDATE: (roomId: string) => `/api/rooms/${roomId}`,
    DELETE: (roomId: string) => `/api/rooms/${roomId}`,
    JOIN: (roomId: string) => `/api/rooms/${roomId}/join`,
    LEAVE: (roomId: string) => `/api/rooms/${roomId}/leave`,
    PARTICIPANTS: (roomId: string) => `/api/rooms/${roomId}/participants`,
    ATTACHMENTS: (roomId: string) => `/api/rooms/${roomId}/attachments`,
  },

  // 3. In-Room Chat Backchannel
  MESSAGES: {
    LIST: (roomId: string) => `/api/rooms/${roomId}/messages`,
    SEND: (roomId: string) => `/api/rooms/${roomId}/messages`,
    DELETE: (roomId: string, messageId: string) =>
      `/api/rooms/${roomId}/messages/${messageId}`,
    ATTACHMENTS: (roomId: string) => `/api/rooms/${roomId}/attachments`,
    REACTIONS: (roomId: string, messageId: string) =>
      `/api/rooms/${roomId}/messages/${messageId}/reactions`,
  },

  // 4. Users & Language Portfolio
  USERS: {
    DETAIL: (userId: string) => `/api/users/${userId}`,
    UPDATE_PORTFOLIO: "/api/users/portfolio",
    STATS: "/api/users/stats",
  },

  // 5. Topic Prompts & Conversation Starters
  TOPICS: {
    LIST: "/api/topics",
    PROMPTS: "/api/topics/prompts",
  },

  // 6. Network Telemetry & Platform Counters
  NETWORK: {
    STATS: "/api/stats/network",
  },
} as const;

export type ApiPaths = typeof API_PATHS;
