import { z } from "zod";
import { MessageType } from "@/enums";

export const sendMessageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1).max(500),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
