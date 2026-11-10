"use client";

import { ENV } from "@/constants";
import { parsePresenceEvent } from "./protocol.mjs";

export interface OnlineLearnersState {
  count: number | null;
  connected: boolean;
  reconnecting: boolean;
}

const INITIAL_STATE: OnlineLearnersState = {
  count: null,
  connected: false,
  reconnecting: false,
};

class PresenceClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<() => void>();
  private state = INITIAL_STATE;
  private authenticated = false;
  private stopped = true;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("nimble:presence-auth-state", this.handleAuthState);
      window.addEventListener("storage", this.handleStorage);
    }
  }

  private handleAuthState = (event: Event) => {
    const authenticated = Boolean(
      (event as CustomEvent<{ authenticated?: boolean }>).detail?.authenticated
    );
    this.authenticated = authenticated;
    if (authenticated) this.start();
    else this.stop();
  };

  private handleStorage = (event: StorageEvent) => {
    if (event.key === "token" || event.key === "nimble_auth_token") {
      const authenticated = Boolean(
        localStorage.getItem("token") || localStorage.getItem("nimble_auth_token")
      );
      this.authenticated = authenticated;
      if (authenticated) this.start();
      else this.stop();
    }
  };

  getSnapshot = (): OnlineLearnersState => this.state;
  getServerSnapshot = (): OnlineLearnersState => INITIAL_STATE;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start(): void {
    if (typeof window === "undefined") return;
    this.authenticated = true;
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.attempts = 0;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "session ended");
    this.update({ ...this.state, connected: false, reconnecting: false, count: null });
  }

  private connect(): void {
    if (this.stopped || !this.authenticated || this.socket) return;

    let socket: WebSocket;
    try {
      socket = new WebSocket(ENV.PRESENCE_WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.socket !== socket) return;
      this.attempts = 0;
      this.update({ ...this.state, connected: true, reconnecting: false });
      socket.send(JSON.stringify({ version: 1, type: "presence:sync" }));
    });

    socket.addEventListener("message", (message) => {
      if (this.socket !== socket || typeof message.data !== "string") return;
      const event = parsePresenceEvent(message.data);
      if (event) this.update({ ...this.state, count: event.data.onlineLearners });
    });

    socket.addEventListener("close", (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (event.code === 4001) {
        this.authenticated = false;
        this.stopped = true;
        this.update({ ...this.state, connected: false, reconnecting: false });
        return;
      }
      this.update({ ...this.state, connected: false });
      this.scheduleReconnect();
    });

    socket.addEventListener("error", () => socket.close());
  }

  private scheduleReconnect(): void {
    if (this.stopped || !this.authenticated || this.retryTimer) return;
    this.attempts += 1;
    const capMs = Math.min(30_000, 500 * 2 ** Math.min(this.attempts, 6));
    const delayMs = Math.round(capMs * (0.75 + Math.random() * 0.5));
    this.update({ ...this.state, connected: false, reconnecting: true });
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delayMs);
  }

  private update(state: OnlineLearnersState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

export const presenceClient = new PresenceClient();
