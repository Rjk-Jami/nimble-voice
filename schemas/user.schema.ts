import { z } from "zod";
import { CEFRLevel } from "@/enums";

export const userProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).max(50),
  nativeLanguage: z.string().min(1, { message: "Native language is required" }),
  learningLanguage: z.string().min(1, { message: "Learning language is required" }),
  cefrLevel: z.nativeEnum(CEFRLevel).default(CEFRLevel.B1),
  location: z.string().max(100).optional(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
