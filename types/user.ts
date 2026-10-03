import { CEFRLevel } from "@/enums";

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  location?: string;
  nativeLanguage: string;
  learningLanguage: string;
  isVerified: boolean;
  cefrPortfolio: Record<string, CEFRLevel>;
  karma: number;
  hoursSpoken: number;
  streak: number;
  isGuest?: boolean;
}

export interface UserStats {
  hoursSpokenThisMonth: number;
  totalRoomsJoined: number;
  frequentPartnersCount: number;
  currentStreakDays: number;
  karmaPoints: number;
}
