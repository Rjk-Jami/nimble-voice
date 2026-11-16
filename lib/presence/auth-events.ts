"use client";

/**
 * @deprecated Legacy WebSocket presence has been eliminated in Phase 3.
 * User presence is now managed authoritatively via JWT-authenticated Socket.IO gateway.
 */
export const AUTH_STATE_EVENT = "nimble:presence-auth-state";

/**
 * @deprecated No-op function retained for backward-compatibility with legacy auth hooks.
 */
export function setPresenceAuthenticated(_authenticated: boolean): void {
  // No-op: Socket.IO manages connection and presence directly via JWT auth
}
