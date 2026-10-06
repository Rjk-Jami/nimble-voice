"use client";

import { io, Socket } from "socket.io-client";
import { User, ChatMessage } from "@/types";
import {
  SignalingOfferPayload,
  SignalingAnswerPayload,
  SignalingIcePayload,
} from "@/types/webrtc";
import { ENV } from "@/constants";

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;

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
              localStorage.getItem("token") ||
              localStorage.getItem("nimble_auth_token") ||
              "";
            cb({
              token: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "",
            });
          } else {
            cb({ token: "" });
          }
        },
      });

      this.socket.on("connect", () => {
        console.log(`[SocketService] Connected to gateway (${ENV.SOCKET_URL}): ${this.socket?.id}`);
      });

      this.socket.on("connected", (data) => {
        console.log("⚡ [SocketService] Go Gateway handshake confirmed:", data);
      });

      this.socket.on("connect_error", (error) => {
        console.warn(
          `[SocketService] Connection error to ${ENV.SOCKET_URL}:`,
          error.message
        );
      });


      this.socket.on("disconnect", (reason) => {
        console.log(`[SocketService] Disconnected from gateway: ${reason}`);
      });
    }

    return this.socket;
  }

  public connect(): Socket {
    const socket = this.getSocket();
    if (!socket.connected && !this.isConnecting) {
      this.isConnecting = true;
      socket.connect();
      socket.once("connect", () => {
        this.isConnecting = false;
      });
      socket.once("connect_error", () => {
        this.isConnecting = false;
      });
    }
    return socket;
  }

  public disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  public joinLobby(): void {
    const socket = this.connect();
    socket.emit("lobby:join");
  }

  public leaveLobby(): void {
    if (this.socket?.connected) {
      this.socket.emit("lobby:leave");
    }
  }

  public joinRoom(roomId: string, user: Partial<User>): void {
    const socket = this.connect();
    socket.emit("room:join", { roomId, user });
  }

  public leaveRoom(roomId?: string): void {
    if (this.socket?.connected) {
      this.socket.emit("room:leave", { roomId });
    }
  }

  public sendOffer(payload: SignalingOfferPayload): void {
    if (this.socket?.connected) {
      this.socket.emit("webrtc:offer", payload);
    }
  }

  public sendAnswer(payload: SignalingAnswerPayload): void {
    if (this.socket?.connected) {
      this.socket.emit("webrtc:answer", payload);
    }
  }

  public sendIceCandidate(payload: SignalingIcePayload): void {
    if (this.socket?.connected) {
      this.socket.emit("webrtc:ice-candidate", payload);
    }
  }

  public sendSpeaking(roomId: string, isSpeaking: boolean, level: number): void {
    if (this.socket?.connected) {
      this.socket.emit("voice:speaking", { roomId, isSpeaking, level });
    }
  }

  public sendVoiceState(
    roomId: string,
    state: { isMuted?: boolean; isDeafened?: boolean; handRaised?: boolean }
  ): void {
    if (this.socket?.connected) {
      this.socket.emit("voice:state-toggle", { roomId, ...state });
    }
  }

  public sendChatMessage(
    roomId: string,
    messageOrContent: ChatMessage | string,
    type: string = "TEXT"
  ): void {
    if (this.socket?.connected) {
      if (typeof messageOrContent === "string") {
        this.socket.emit("chat:send", { roomId, content: messageOrContent, type });
      } else {
        this.socket.emit("chat:send", {
          roomId,
          content: messageOrContent.content,
          type: messageOrContent.type,
          mediaUrl: messageOrContent.mediaUrl,
          mediaType: messageOrContent.mediaType,
          message: messageOrContent,
        });
      }
    }
  }

  public sendReaction(
    roomId: string,
    reaction: { id: string; emoji: string; xOffset?: number }
  ): void {
    if (this.socket?.connected) {
      this.socket.emit("reaction:send", { roomId, reaction });
    }
  }

  public reactToMessage(
    roomId: string,
    messageId: string,
    emoji: string,
    userId?: string
  ): void {
    if (this.socket?.connected) {
      this.socket.emit("chat:reaction-add", { roomId, messageId, emoji, userId });
      this.socket.emit("chat:react", { roomId, messageId, emoji, userId });
    }
  }


  public kickUser(roomId: string, targetUserId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("host:kick-user", { roomId, targetUserId });
    }
  }

  public async measureLatency(): Promise<number> {
    if (!this.socket?.connected) return 24;
    return new Promise((resolve) => {
      const start = Date.now();
      this.socket?.emit("mesh:ping", start, () => {
        const rtt = Date.now() - start;
        resolve(Math.max(8, rtt));
      });
      setTimeout(() => resolve(28), 1000);
    });
  }
}

export const socketService = new SocketService();
