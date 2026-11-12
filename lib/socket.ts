"use client";

import { io, Socket } from "socket.io-client";
import { ENV } from "@/constants";
import {
  CANONICAL_SERVER_EVENTS,
  SocketCommandError,
  createCommandTracker,
  createEnvelopeGuard,
} from "@/lib/socket-protocol.mjs";
import type {
  CanonicalClientCommand,
  CanonicalServerEvent,
  ChatReactAckDTO,
  DeliveryAckDTO,
  LobbySubscriptionAckDTO,
  MeshPingAckDTO,
  ModerationKickAckDTO,
  ModerationLockAckDTO,
  ModerationMuteAckDTO,
  PresenceDTO,
  RoomJoinAckDTO,
  RoomLeaveAckDTO,
  ScreenShareAckDTO,
  ServerEventEnvelope,
  ServerEventPayloadMap,
  VoiceMuteChangedDTO,
} from "@/types/socket";
import type {
  SignalingAnswerPayload,
  SignalingIcePayload,
  SignalingOfferPayload,
} from "@/types/webrtc";

export { SocketCommandError };

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private needsResubscribe: boolean = false;
  private activeRoomId: string | null = null;
  private isLobbySubscribed: boolean = false;
  private envelopeGuard = createEnvelopeGuard({ maxSeenEvents: 1000 });
  private commandTracker = createCommandTracker({ defaultTimeoutMs: 8000 });
  private listeners = new Map<
    CanonicalServerEvent,
    Set<(data: any, envelope: ServerEventEnvelope<any, any>) => void>
  >();

  public getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(ENV.SOCKET_URL, {
        path: ENV.SOCKET_PATH,
        transports: ["websocket", "polling"],
        withCredentials: true,
        autoConnect: false,

        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        timeout: 10000,
        auth: (cb) => {
          if (typeof window !== "undefined") {
            const token =
              sessionStorage.getItem("nimble_guest_token") ||
              localStorage.getItem("token") ||
              localStorage.getItem("nimble_auth_token") ||
              "";
            cb({
              token: token
                ? token.startsWith("Bearer ")
                  ? token
                  : `Bearer ${token}`
                : "",
            });
          } else {
            cb({ token: "" });
          }
        },
      });

      this.socket.on("command.ack", (ack: unknown) => {
        this.commandTracker.resolveAck(ack);
      });

      for (const event of CANONICAL_SERVER_EVENTS) {
        this.socket.on(event, (raw: unknown) => {
          const result = this.envelopeGuard.evaluate(raw);
          if (!result.accepted) {
            if (result.reason !== "duplicate_event_id") {
              console.debug(
                `[SocketService] Dropped envelope for ${event}:`,
                result.reason
              );
            }
            return;
          }

          const envelope = result.envelope;
          const subscribers = this.listeners.get(envelope.event);
          if (!subscribers || subscribers.size === 0) {
            return;
          }

          for (const handler of Array.from(subscribers)) {
            try {
              handler(envelope.data, envelope);
            } catch (err) {
              console.error(
                `[SocketService] Listener error for ${envelope.event}:`,
                err
              );
            }
          }
        });
      }

      this.socket.on("connect", () => {
        this.isConnecting = false;
        console.log(
          `[SocketService] Connected to gateway (${ENV.SOCKET_URL}): ${this.socket?.id}`
        );

        if (this.needsResubscribe) {
          this.needsResubscribe = false;
          if (this.isLobbySubscribed) {
            this.emitCommand<LobbySubscriptionAckDTO>("lobby.join", {}).catch(
              (err) => {
                console.warn(
                  "[SocketService] Failed to resubscribe lobby on reconnect:",
                  err
                );
              }
            );
          }
          if (this.activeRoomId) {
            this.emitCommand<RoomJoinAckDTO>("room.join", {
              roomId: this.activeRoomId,
            }).catch((err) => {
              console.warn(
                "[SocketService] Failed to rejoin room on reconnect:",
                err
              );
            });
          }
        }
      });

      this.socket.on("connect_error", (error) => {
        this.isConnecting = false;
        console.warn(
          `[SocketService] Connection error to ${ENV.SOCKET_URL}:`,
          error.message
        );
        this.commandTracker.rejectAll(
          error.message || "Socket connection failed"
        );
      });

      this.socket.on("disconnect", (reason) => {
        this.isConnecting = false;
        if (reason !== "io client disconnect") {
          this.needsResubscribe = true;
        }
        console.log(`[SocketService] Disconnected from gateway: ${reason}`);
        this.commandTracker.rejectAll(`Socket disconnected: ${reason}`);
      });
    }

    return this.socket;
  }

  public connect(): Socket {
    const socket = this.getSocket();
    if (!socket.connected && !this.isConnecting) {
      this.isConnecting = true;
      socket.connect();
    }
    return socket;
  }

  public disconnect(): void {
    this.isConnecting = false;
    this.needsResubscribe = false;
    this.isLobbySubscribed = false;
    this.activeRoomId = null;
    this.commandTracker.rejectAll("Socket disconnected");
    this.envelopeGuard.reset();
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  public onEvent<E extends CanonicalServerEvent>(
    event: E,
    handler: (
      data: ServerEventPayloadMap[E],
      envelope: ServerEventEnvelope<ServerEventPayloadMap[E], E>
    ) => void
  ): () => void {
    this.getSocket();
    let subscribers = this.listeners.get(event);
    if (!subscribers) {
      subscribers = new Set();
      this.listeners.set(event, subscribers);
    }

    const wrapped = handler as (
      data: any,
      envelope: ServerEventEnvelope<any, any>
    ) => void;
    subscribers.add(wrapped);

    return () => {
      const current = this.listeners.get(event);
      if (!current) return;
      current.delete(wrapped);
      if (current.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  private waitForConnect(socket: Socket, timeoutMs: number): Promise<void> {
    if (socket.connected) {
      return Promise.resolve();
    }

    const effectiveTimeoutMs =
      typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : 8000;

    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        socket.off("connect", onConnect);
        socket.off("connect_error", onConnectError);
      };

      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onConnectError = (err: Error) => {
        cleanup();
        reject(
          new SocketCommandError(
            err?.message || "Socket connection failed",
            "DISCONNECTED",
            ""
          )
        );
      };

      timer = setTimeout(() => {
        cleanup();
        reject(
          new SocketCommandError(
            `Socket connection timed out after ${effectiveTimeoutMs}ms`,
            "TIMEOUT",
            ""
          )
        );
      }, effectiveTimeoutMs);

      socket.once("connect", onConnect);
      socket.once("connect_error", onConnectError);
      this.connect();
    });
  }

  public async emitCommand<TData = unknown>(
    command: CanonicalClientCommand,
    payload: Record<string, unknown> = {},
    timeoutMs: number = 8000
  ): Promise<TData> {
    const socket = this.getSocket();
    if (!socket.connected) {
      await this.waitForConnect(socket, timeoutMs);
    }

    if (!socket.connected) {
      throw new SocketCommandError("Socket disconnected", "DISCONNECTED", "");
    }

    const requestId = this.commandTracker.createRequestId();
    const ackPromise = this.commandTracker.register<TData>(requestId, {
      timeoutMs,
    });
    socket.emit(command, { ...payload, requestId });
    return ackPromise;
  }

  public joinLobby(): Promise<LobbySubscriptionAckDTO> {
    this.isLobbySubscribed = true;
    return this.emitCommand<LobbySubscriptionAckDTO>("lobby.join", {});
  }

  public async leaveLobby(): Promise<LobbySubscriptionAckDTO | void> {
    this.isLobbySubscribed = false;
    if (!this.socket?.connected) {
      return;
    }
    return this.emitCommand<LobbySubscriptionAckDTO>("lobby.leave", {});
  }

  public requestPresence(): Promise<PresenceDTO> {
    return this.emitCommand<PresenceDTO>("presence.request", {});
  }

  public joinRoom(roomId: string): Promise<RoomJoinAckDTO> {
    this.activeRoomId = roomId;
    return this.emitCommand<RoomJoinAckDTO>("room.join", { roomId });
  }

  public async leaveRoom(roomId?: string): Promise<RoomLeaveAckDTO | void> {
    const leavingRoomId = roomId || this.activeRoomId;
    if (!roomId || roomId === this.activeRoomId) {
      this.activeRoomId = null;
    }
    if (!leavingRoomId || !this.socket?.connected) {
      return;
    }
    return this.emitCommand<RoomLeaveAckDTO>("room.leave", {
      roomId: leavingRoomId,
    });
  }

  public sendOffer(payload: SignalingOfferPayload): Promise<DeliveryAckDTO> {
    return this.emitCommand<DeliveryAckDTO>("webrtc.offer", {
      roomId: this.activeRoomId,
      targetSocketId: payload.targetSocketId,
      sdp: payload.sdp,
    });
  }

  public sendAnswer(payload: SignalingAnswerPayload): Promise<DeliveryAckDTO> {
    return this.emitCommand<DeliveryAckDTO>("webrtc.answer", {
      roomId: this.activeRoomId,
      targetSocketId: payload.targetSocketId,
      sdp: payload.sdp,
    });
  }

  public sendIceCandidate(
    payload: SignalingIcePayload
  ): Promise<DeliveryAckDTO> {
    return this.emitCommand<DeliveryAckDTO>("webrtc.ice_candidate", {
      roomId: this.activeRoomId,
      targetSocketId: payload.targetSocketId,
      candidate: payload.candidate,
    });
  }

  public sendSpeaking(
    roomId: string,
    isSpeaking: boolean,
    level: number
  ): void {
    if (this.socket?.connected) {
      this.socket.emit("voice.speaking", {
        roomId,
        isSpeaking,
        level,
      });
    }
  }

  public sendVoiceState(
    roomId: string,
    state: { isMuted?: boolean; isDeafened?: boolean; handRaised?: boolean }
  ): Promise<VoiceMuteChangedDTO> {
    return this.emitCommand<VoiceMuteChangedDTO>("voice.mute", {
      roomId,
      ...state,
    });
  }

  public setScreenShare(
    roomId: string,
    isSharing: boolean
  ): Promise<ScreenShareAckDTO> {
    return this.emitCommand<ScreenShareAckDTO>(
      isSharing ? "screen_share.start" : "screen_share.stop",
      { roomId }
    );
  }

  public reactToMessage(
    roomId: string,
    messageId: string,
    emoji: string
  ): Promise<ChatReactAckDTO> {
    return this.emitCommand<ChatReactAckDTO>("chat.react", {
      roomId,
      messageId,
      emoji,
    });
  }

  public muteUser(
    roomId: string,
    targetUserId: string
  ): Promise<ModerationMuteAckDTO> {
    return this.emitCommand<ModerationMuteAckDTO>(
      "moderation.mute_participant",
      {
        roomId,
        targetUserId,
      }
    );
  }

  public kickUser(
    roomId: string,
    targetUserId: string,
    reason?: string
  ): Promise<ModerationKickAckDTO> {
    return this.emitCommand<ModerationKickAckDTO>(
      "moderation.kick_participant",
      {
        roomId,
        targetUserId,
        ...(reason ? { reason } : {}),
      }
    );
  }

  public lockRoom(
    roomId: string,
    isLocked: boolean
  ): Promise<ModerationLockAckDTO> {
    return this.emitCommand<ModerationLockAckDTO>("moderation.lock_room", {
      roomId,
      isLocked,
    });
  }

  public async measureLatency(): Promise<number> {
    if (!this.socket?.connected) return 24;
    const start = Date.now();
    try {
      await this.emitCommand<MeshPingAckDTO>(
        "mesh.ping",
        { timestamp: start },
        2000
      );
      const rtt = Date.now() - start;
      return Math.max(8, rtt);
    } catch {
      return 28;
    }
  }
}

export const socketService = new SocketService();
