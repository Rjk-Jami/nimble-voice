"use client";

import { useEffect, useSyncExternalStore } from "react";
import { presenceClient } from "@/lib/presence/client";

export function useOnlineLearners() {
  const state = useSyncExternalStore(
    presenceClient.subscribe,
    presenceClient.getSnapshot,
    presenceClient.getServerSnapshot
  );

  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("nimble_auth_token");
    if (token) presenceClient.start();
  }, []);

  return {
    count: state.count,
    connected: state.connected,
    reconnecting: state.reconnecting,
  };
}
