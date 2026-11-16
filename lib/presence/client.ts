"use client";

/**
 * @deprecated Legacy WebSocket presence has been eliminated in Phase 3.
 * Do NOT use native WebSocket connections to /ws/presence.
 * Use useOnlineLearners() hook or useLobbyStore((s) => s.onlineCount) instead.
 */
export interface OnlineLearnersState {
  count: number | null;
  connected: boolean;
  reconnecting: boolean;
}

const DEPRECATED_STATE: OnlineLearnersState = {
  count: null,
  connected: false,
  reconnecting: false,
};

class DeprecatedPresenceClient {
  getSnapshot = (): OnlineLearnersState => DEPRECATED_STATE;
  getServerSnapshot = (): OnlineLearnersState => DEPRECATED_STATE;
  subscribe = (_listener: () => void): (() => void) => () => {};
  start(): void {}
  stop(): void {}
}

export const presenceClient = new DeprecatedPresenceClient();
