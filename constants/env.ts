/**
 * NimbleVoice — Centralized Frontend Environment Variables
 * Single source of truth for runtime configurations, endpoints, and flags.
 */

export const ENV = {
  /**
   * HTTP REST API Base URL
   * Default: http://localhost:8080/api (Go Gin Backend)
   */
  API_URL:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",

  /**
   * Real-Time Socket.IO Gateway Host
   * Default: http://localhost:8080 (Go Socket Gateway)
   */
  SOCKET_URL:
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_SIGNALING_URL ||
    "http://localhost:8080",

  /**
   * Socket.IO Gateway Path
   * Default: /socket.io/
   */
  SOCKET_PATH:
    process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io/",

  /**
   * STUN / TURN Ice Server Credentials (optional remote fallback)
   */
  TURN_URL: process.env.NEXT_PUBLIC_TURN_URL || "",
  TURN_USERNAME: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
  TURN_CREDENTIAL: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",

  /**
   * Application Metadata
   */
  APP_NAME: "NimbleVoice",
  APP_DESCRIPTION: "Real-time multilingual voice exchange platform",
  SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

  /**
   * Node Environment Flags
   */
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
} as const;

export type EnvConfig = typeof ENV;

export const {
  API_URL,
  SOCKET_URL,
  SOCKET_PATH,
  TURN_URL,
  TURN_USERNAME,
  TURN_CREDENTIAL,
  APP_NAME,
  APP_DESCRIPTION,
  SITE_URL,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
} = ENV;
