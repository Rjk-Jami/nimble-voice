"use client";

import { useEffect, useCallback } from "react";
import { useMessengerStore, useAuthStore } from "@/stores";
import { ChatMessage } from "@/types";

export function useMessenger(roomId: string, initialMessages: ChatMessage[] = []) {
  const {
    messages,
    unreadCount,
    setMessages,
    sendTextMessage,
    sendReaction,
    clearMessages,
    resetUnread,
  } = useMessengerStore();

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, messages.length, setMessages]);

  const handleSendText = useCallback(
    (text: string) => {
      if (!text.trim() || !user) return;
      sendTextMessage(roomId, { id: user.id, name: user.name }, text);
    },
    [roomId, user, sendTextMessage]
  );

  const handleSendReaction = useCallback(
    (emoji: string) => {
      if (!user) return;
      sendReaction(roomId, { id: user.id, name: user.name }, emoji);
    },
    [roomId, user, sendReaction]
  );

  return {
    messages,
    unreadCount,
    sendMessage: handleSendText,
    sendReaction: handleSendReaction,
    clearMessages,
    resetUnread,
  };
}
