"use client";

import { useAuthStore } from "@/stores";
import { User } from "@/types";

export function useAuth() {
  const { user, isAuthenticated, isGuest, login, logout, setGuestUser, updateProfile } =
    useAuthStore();

  return {
    user,
    isAuthenticated,
    isGuest,
    login,
    logout,
    loginAsGuest: (name?: string) => setGuestUser(name),
    updateProfile: (updates: Partial<User>) => updateProfile(updates),
  };
}
