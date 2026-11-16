"use client";

import { useEffect, useState } from "react";
import { useLobbyStore } from "@/stores";
import { socketService } from "@/lib/socket";

export function useOnlineLearners() {
  const onlineCount = useLobbyStore((s) => s.onlineCount);
  const [connected, setConnected] = useState<boolean>(() => socketService.isConnected());

  useEffect(() => {
    const socket = socketService.getSocket();
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    setConnected(socket.connected);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return {
    count: onlineCount,
    connected,
    reconnecting: !connected && onlineCount !== null,
  };
}
