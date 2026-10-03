"use client";

import { useEffect, useState, useCallback } from "react";
import { useRoomStore, useVoiceStore } from "@/stores";
import { VoiceRoom } from "@/types";

export function useVoiceRoom(room: VoiceRoom | null) {
  const currentRoom = useRoomStore((s) => s.currentRoom) || room;
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  const {
    isMuted,
    isDeafened,
    isScreenSharing,
    handRaised,
    networkLatency,
    speakingMap,
    audioLevels,
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
    toggleHandRaised,
    resetVoiceState,
  } = useVoiceStore();

  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(
    (currentRoom?.activeSinceMinutes || 0) * 60
  );

  // Live in-call timer
  useEffect(() => {
    if (!currentRoom) return;

    const timer = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRoom]);

  // Format call timer into mm:ss or hh:mm:ss
  const formatDuration = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleLeave = useCallback(() => {
    resetVoiceState();
    leaveRoom();
  }, [resetVoiceState, leaveRoom]);

  return {
    room: currentRoom,
    isMuted,
    isDeafened,
    isScreenSharing,
    handRaised,
    networkLatency,
    speakingMap,
    audioLevels,
    formattedDuration: formatDuration(callDurationSeconds),
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
    toggleHandRaised,
    leaveRoom: handleLeave,
  };
}
