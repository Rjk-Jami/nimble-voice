"use client";

import { useEffect, useState, useCallback } from "react";
import { useRoomStore, useVoiceStore } from "@/stores";
import { VoiceRoom } from "@/types";
import { useWebRTC } from "./useWebRTC";
import { apiClient } from "@/lib/axios";
import { API_PATHS } from "@/constants";


export function useVoiceRoom(room: VoiceRoom | null) {
  const currentRoom = useRoomStore((s) => s.currentRoom) || room;
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  // Initialize WebRTC peer mesh and Socket.io signaling
  const {
    localStream,
    remotePeers,
    remoteScreenStream,
    isSocketConnected,
    connectionStatus,
    shareScreen,
    switchAudioInput,
  } = useWebRTC(currentRoom?.id);

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

  // Synchronized active room duration based on room's creation timestamp
  const calculateElapsedSeconds = useCallback(() => {
    if (!currentRoom?.startedAt) return (currentRoom?.activeSinceMinutes || 0) * 60;
    const startedMs = new Date(currentRoom.startedAt).getTime();
    if (isNaN(startedMs)) return (currentRoom?.activeSinceMinutes || 0) * 60;
    return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
  }, [currentRoom?.startedAt, currentRoom?.activeSinceMinutes]);

  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(calculateElapsedSeconds);

  // Live in-call timer ticking every second
  useEffect(() => {
    setCallDurationSeconds(calculateElapsedSeconds());

    const timer = setInterval(() => {
      setCallDurationSeconds(calculateElapsedSeconds());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateElapsedSeconds]);

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

  const handleLeave = useCallback(async () => {
    if (currentRoom?.id) {
      try {
        await apiClient.post(API_PATHS.ROOMS.LEAVE(currentRoom.id));
      } catch (err) {
        console.warn("Backend leave notice:", err);
      }
    }
    resetVoiceState();
    leaveRoom();
  }, [currentRoom?.id, resetVoiceState, leaveRoom]);


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
    localStream,
    remotePeers,
    remoteScreenStream,
    isSocketConnected,
    connectionStatus,
    shareScreen,
    switchAudioInput,
    leaveRoom: handleLeave,
  };
}
