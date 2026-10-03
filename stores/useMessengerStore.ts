import { create } from "zustand";
import { ChatMessage } from "@/types";
import { MessageType } from "@/enums";

interface MessengerState {
  messages: ChatMessage[];
  unreadCount: number;
  typingUsers: string[];

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
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
