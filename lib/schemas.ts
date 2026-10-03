import { z } from "zod";

export const createRoomSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Room title must be at least 3 characters" })
    .max(80, { message: "Room title must not exceed 80 characters" }),
  language: z.string().min(1, { message: "Please select a language" }),
  cefrLevel: z.enum(["ANY", "A1", "A2", "B1", "B2", "C1", "C2", "NATIVE"]),
  maxParticipants: z.number().min(2).max(10),
  topicTag: z.string().min(1),
  isBeginnerFriendly: z.boolean().default(true),
});

export type CreateRoomFormData = z.infer<typeof createRoomSchema>;

export const userProfileSchema = z.object({
  name: z.string().min(2),
  nativeLanguage: z.string(),
  learningLanguages: z.array(
    z.object({
      language: z.string(),
      level: z.string(),
    })
  ),
  bio: z.string().max(200).optional(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
