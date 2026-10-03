import { z } from "zod";
import { Language, CEFRLevel } from "@/enums";

export const createRoomSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Room title must be at least 3 characters" })
    .max(80, { message: "Room title cannot exceed 80 characters" }),
  language: z.nativeEnum(Language),
  cefrLevel: z.nativeEnum(CEFRLevel),
  maxSlots: z
    .number()
    .min(2, { message: "Minimum 2 participants" })
    .max(10, { message: "Maximum 10 participants" })
    .default(5),
  topicTag: z.string().min(1, { message: "Please select a category tag" }),
  isBeginnerFriendly: z.boolean().default(true),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  roomId: z.string().min(1),
  password: z.string().optional(),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
