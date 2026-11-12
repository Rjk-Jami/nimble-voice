import { create } from "zustand";
import { ChatMessage } from "@/types";
import { MessageType } from "@/enums";
import { useAuthStore } from "./useAuthStore";

interface MessengerState {
  messages: ChatMessage[];
  unreadCount: number;
  typingUsers: string[];

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  reconcileMessage: (message: ChatMessage) => void;
  removeMessage: (idOrClientMessageId: string) => void;
  sendTextMessage: (roomId: string, sender: { id: string; name: string }, content: string) => void;
  sendReaction: (roomId: string, sender: { id: string; name: string }, emoji: string) => void;
  clearMessages: () => void;
  resetUnread: () => void;
}

export const useMessengerStore = create<MessengerState>((set) => ({
  messages: [],
  unreadCount: 0,
  typingUsers: [],

  setMessages: (messages) => set({ messages, unreadCount: 0 }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      unreadCount: state.unreadCount + 1,
    })),

  reconcileMessage: (message) =>
    set((state) => {
      const existingIndex = state.messages.findIndex(
        (m) =>
          m.id === message.id ||
          (Boolean(message.clientMessageId) &&
            (m.clientMessageId === message.clientMessageId ||
              m.id === message.clientMessageId))
      );

      if (existingIndex !== -1) {
        const nextMessages = [...state.messages];
        const existing = nextMessages[existingIndex];
        nextMessages[existingIndex] = {
          ...existing,
          ...message,
          pending: message.pending ?? false,
        };
        return { messages: nextMessages };
      }

      const currentUserId = useAuthStore.getState().user?.id;
      const isOwn = Boolean(currentUserId && message.sender?.id === currentUserId);
      return {
        messages: [...state.messages, message],
        unreadCount: isOwn ? state.unreadCount : state.unreadCount + 1,
      };
    }),

  removeMessage: (idOrClientMessageId) =>
    set((state) => ({
      messages: state.messages.filter(
        (m) =>
          m.id !== idOrClientMessageId &&
          m.clientMessageId !== idOrClientMessageId
      ),
    })),

  sendTextMessage: (roomId, sender, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `msg-${Date.now()}`,
          roomId,
          sender,
          content: content.trim(),
          type: MessageType.TEXT,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    })),

  sendReaction: (roomId, sender, emoji) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `react-${Date.now()}`,
          roomId,
          sender,
          content: `${emoji} reacted`,
          type: MessageType.REACTION,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    })),

  clearMessages: () => set({ messages: [], unreadCount: 0 }),
  resetUnread: () => set({ unreadCount: 0 }),
}));
