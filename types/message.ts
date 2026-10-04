import { MessageType } from "@/enums";
import { User } from "./user";

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: User | { id: string; name: string; avatarUrl?: string };
  content: string;
  type: MessageType;
  reactions?: Record<string, string[]> | string[];
  isHighlighted?: boolean;
  createdAt: string;
}
