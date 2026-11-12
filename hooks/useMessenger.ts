"use client";

import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useMessengerStore, useAuthStore } from "@/stores";
import { ChatMessage } from "@/types";
import { MessageType } from "@/enums";
import { socketService } from "@/lib/socket";
import { apiClient } from "@/lib/axios";
import { API_PATHS } from "@/constants";
import { normalizeMessage, normalizeReactions } from "@/lib/normalize";
import type { ChatMessageDTO, ChatReactionUpdatedDTO } from "@/types/socket";

function generateClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useMessenger(roomId: string, initialMessages: ChatMessage[] = []) {
  const {
    messages,
    unreadCount,
    setMessages,
    reconcileMessage,
    removeMessage,
    clearMessages,
    resetUnread,
  } = useMessengerStore();

  const user = useAuthStore((s) => s.user);
  const pendingReactionsRef = useRef<Set<string>>(new Set());

  // Sync incoming real-time canonical socket chat messages & reactions
  useEffect(() => {
    if (!roomId) return;

    const unsubMessage = socketService.onEvent(
      "chat.message_created",
      (rawMsg: ChatMessageDTO) => {
        if (rawMsg.roomId && rawMsg.roomId !== roomId) return;
        reconcileMessage(normalizeMessage(rawMsg));
      }
    );

    const unsubReaction = socketService.onEvent(
      "chat.reaction_updated",
      (data: ChatReactionUpdatedDTO) => {
        if (data.roomId && data.roomId !== roomId) return;

        if (!data.reactions && data.userId && data.userId === user?.id) {
          const pendingKey = `${data.messageId}:${data.emoji}`;
          if (pendingReactionsRef.current.has(pendingKey)) {
            pendingReactionsRef.current.delete(pendingKey);
            return;
          }
        }

        const current = useMessengerStore.getState().messages;
        setMessages(
          current.map((m) => {
            if (m.id !== data.messageId) return m;
            if (data.reactions) {
              return { ...m, reactions: normalizeReactions(data.reactions) };
            }
            if (data.emoji && data.userId) {
              const rMap = normalizeReactions(m.reactions);
              const userList = rMap[data.emoji] || [];
              const already = userList.includes(data.userId);
              Object.keys(rMap).forEach((e) => {
                rMap[e] = rMap[e].filter((id) => id !== data.userId);
                if (rMap[e].length === 0) delete rMap[e];
              });
              if (!already) {
                if (!rMap[data.emoji]) rMap[data.emoji] = [];
                rMap[data.emoji].push(data.userId);
              }
              return { ...m, reactions: rMap };
            }
            return m;
          })
        );
      }
    );

    return () => {
      unsubMessage();
      unsubReaction();
    };
  }, [roomId, user?.id, reconcileMessage, setMessages]);

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

  const uploadAttachment = useCallback(
    async (file: File): Promise<{ url: string; filename: string; contentType?: string } | null> => {
      if (!roomId) return null;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res: any = await apiClient.post(API_PATHS.ROOMS.ATTACHMENTS(roomId), formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return {
          url: res?.url || "",
          filename: res?.filename || file.name,
          contentType: res?.contentType || file.type,
        };
      } catch (err) {
        console.error("Failed to upload attachment:", err);
        return null;
      }
    },
    [roomId]
  );

  const handleSendText = useCallback(
    async (text: string, media?: { url: string; type: string }) => {
      if ((!text.trim() && !media) || !user || !roomId) return;
      const msgType = media ? MessageType.IMAGE : MessageType.TEXT;
      const clientMessageId = generateClientMessageId();
      const pendingMsg: ChatMessage = {
        id: clientMessageId,
        clientMessageId,
        pending: true,
        roomId,
        sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        content: text.trim(),
        type: msgType,
        mediaUrl: media?.url,
        mediaType: media?.type,
        reactions: {},
        createdAt: new Date().toISOString(),
      };

      reconcileMessage(pendingMsg);

      // Single-write persistence via REST API; backend broadcasts chat.message_created
      try {
        const res: any = await apiClient.post(API_PATHS.MESSAGES.SEND(roomId), {
          content: text.trim(),
          type: msgType,
          mediaUrl: media?.url,
          mediaType: media?.type,
          clientMessageId,
        });
        if (res?.message) {
          reconcileMessage(
            normalizeMessage({
              ...res.message,
              clientMessageId: res.message.clientMessageId || clientMessageId,
            })
          );
        }
      } catch (err) {
        console.warn("Failed to persist chat message:", err);
        removeMessage(clientMessageId);
        toast.error("Failed to send message. Please try again.");
      }
    },
    [roomId, user, reconcileMessage, removeMessage]
  );

  const handleSendReaction = useCallback(
    async (emoji: string) => {
      if (!user || !roomId) return;
      const clientMessageId = generateClientMessageId();
      const pendingReaction: ChatMessage = {
        id: clientMessageId,
        clientMessageId,
        pending: true,
        roomId,
        sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        content: `${emoji} reacted`,
        type: MessageType.REACTION,
        reactions: {},
        createdAt: new Date().toISOString(),
      };

      reconcileMessage(pendingReaction);

      try {
        const res: any = await apiClient.post(API_PATHS.MESSAGES.SEND(roomId), {
          content: `${emoji} reacted`,
          type: MessageType.REACTION,
          clientMessageId,
        });
        if (res?.message) {
          reconcileMessage(
            normalizeMessage({
              ...res.message,
              clientMessageId: res.message.clientMessageId || clientMessageId,
            })
          );
        }
      } catch (err) {
        console.warn("Failed to persist reaction message:", err);
        removeMessage(clientMessageId);
        toast.error("Failed to send reaction. Please try again.");
      }
    },
    [roomId, user, reconcileMessage, removeMessage]
  );

  const handleReactToMessage = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id || !roomId) return;

      const priorMessages = useMessengerStore.getState().messages;
      const target = priorMessages.find((m) => m.id === messageId);
      const priorReactions = target?.reactions;

      if (target) {
        const reactions = normalizeReactions(target.reactions);
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
          priorMessages.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      }

      const pendingKey = `${messageId}:${emoji}`;
      pendingReactionsRef.current.add(pendingKey);

      try {
        await socketService.reactToMessage(roomId, messageId, emoji);
        apiClient
          .post(API_PATHS.MESSAGES.REACTIONS(roomId, messageId), { emoji })
          .catch((err) => {
            console.warn("Backend reaction persistence notice:", err);
          });
      } catch (err: any) {
        const current = useMessengerStore.getState().messages;
        setMessages(
          current.map((m) =>
            m.id === messageId ? { ...m, reactions: priorReactions } : m
          )
        );
        toast.error(err?.message || "Failed to update reaction.");
      } finally {
        pendingReactionsRef.current.delete(pendingKey);
      }
    },
    [roomId, user?.id, setMessages]
  );

  return {
    messages,
    unreadCount,
    sendMessage: handleSendText,
    uploadAttachment,
    sendReaction: handleSendReaction,
    reactToMessage: handleReactToMessage,
    clearMessages,
    resetUnread,
  };
}
