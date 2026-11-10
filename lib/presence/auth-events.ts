"use client";

const AUTH_STATE_EVENT = "nimble:presence-auth-state";

/** Notify the shared presence socket after backend auth cookies are issued or cleared. */
export function setPresenceAuthenticated(authenticated: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUTH_STATE_EVENT, { detail: { authenticated } })
  );
}

export { AUTH_STATE_EVENT };
