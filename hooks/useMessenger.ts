"use client";

import { useEffect, useCallback } from "react";
import { useMessengerStore, useAuthStore } from "@/stores";
import { ChatMessage } from "@/types";
import { MessageType } from "@/enums";
import { socketService } from "@/lib/socket";
import { apiClient } from "@/lib/axios";
import { API_PATHS } from "@/constants";
import { normalizeMessage } from "@/lib/normalize";


export function useMessenger(roomId: string, initialMessages: ChatMessage[] = []) {
  const {
    messages,
    unreadCount,
    setMessages,
    addMessage,
    clearMessages,
    resetUnread,
  } = useMessengerStore();

  const user = useAuthStore((s) => s.user);

  // Sync incoming real-time socket chat messages
  useEffect(() => {
    if (!roomId) return;
    const socket = socketService.getSocket();

    const handleNewMessage = (msg: ChatMessage) => {
      if (msg.sender?.id !== user?.id) {
        addMessage(msg);
      }
    };

    const handleReactionUpdated = ({
      messageId,
      reactions,
    }: {
      messageId: string;
      reactions: Record<string, string[]>;
    }) => {
      const current = useMessengerStore.getState().messages;
      setMessages(
        current.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on("chat:new-message", handleNewMessage);
    socket.on("chat:reaction-updated", handleReactionUpdated);

    return () => {
      socket.off("chat:new-message", handleNewMessage);
      socket.off("chat:reaction-updated", handleReactionUpdated);
    };
  }, [roomId, user?.id, addMessage, setMessages]);

  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    } else if (roomId && messages.length === 0) {
      // Fetch persisted chat history from Go backend
      apiClient
        .get(API_PATHS.MESSAGES.LIST(roomId))
        .then((res: any) => {
          const rawList = res?.messages || (Array.isArray(res) ? res : []);
          if (rawList.length > 0) {
            setMessages(rawList.map(normalizeMessage));
          }
        })
        .catch(() => {});
    }
  }, [initialMessages, messages.length, roomId, setMessages]);

  const handleSendText = useCallback(
    async (text: string) => {
      if (!text.trim() || !user) return;
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomId,
        sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        content: text.trim(),
        type: MessageType.TEXT,
        reactions: {},
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      addMessage(newMsg);
      socketService.sendChatMessage(roomId, newMsg);

      // Asynchronously persist to Go backend database
      try {
        await apiClient.post(API_PATHS.MESSAGES.SEND(roomId), {
          content: text.trim(),
          type: "TEXT",
        });
      } catch (err) {
        console.warn("Backend chat persistence notice:", err);
      }
    },
    [roomId, user, addMessage]
  );


  const handleSendReaction = useCallback(
    (emoji: string) => {
      if (!user) return;
      const reactionMsg: ChatMessage = {
        id: `react-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomId,
        sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        content: `${emoji} reacted`,
        type: MessageType.REACTION,
        reactions: {},
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      addMessage(reactionMsg);
      socketService.sendChatMessage(roomId, reactionMsg);
      socketService.sendReaction(roomId, {
        id: reactionMsg.id,
        emoji,
      });
    },
    [roomId, user, addMessage]
  );

  const handleReactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!user?.id || !roomId) return;

      const current = useMessengerStore.getState().messages;
      const target = current.find((m) => m.id === messageId);
      if (target) {
        const reactions: Record<string, string[]> =
          target.reactions && typeof target.reactions === "object" && !Array.isArray(target.reactions)
            ? { ...(target.reactions as Record<string, string[]>) }
            : {};

        const currentList = reactions[emoji] || [];
        const already = currentList.includes(user.id);

        // One reaction per message per user
        Object.keys(reactions).forEach((e) => {
          reactions[e] = reactions[e].filter((id) => id !== user.id);
          if (reactions[e].length === 0) delete reactions[e];
        });

        if (!already) {
          if (!reactions[emoji]) reactions[emoji] = [];
          reactions[emoji].push(user.id);
        }

        setMessages(
          current.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      }

      socketService.reactToMessage(roomId, messageId, emoji, user.id);
    },
    [roomId, user?.id, setMessages]
  );

  return {
    messages,
    unreadCount,
    sendMessage: handleSendText,
    sendReaction: handleSendReaction,
    reactToMessage: handleReactToMessage,
    clearMessages,
    resetUnread,
  };
}
