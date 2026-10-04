"use client";

import { useMemo, useEffect } from "react";
import useSWR from "swr";
import { API_PATHS } from "@/lib/apiPaths";
import { useLobbyStore, useRoomStore, useAuthStore } from "@/stores";
import { VoiceRoom } from "@/types";
import { Language, CEFRLevel, RoomStatus } from "@/enums";
import { CreateRoomInput } from "@/schemas";
import { LANGUAGE_FLAGS } from "@/enums";
import { socketService } from "@/lib/socket";

export function useRooms() {
  const {
    rooms: storeRooms,
    searchQuery,
    selectedLanguage,
    activeFilter,
    liveStats,
    setRooms,
    setLiveStats,
    setSearchQuery,
    setSelectedLanguage,
    setActiveFilter,
    addRoom,
  } = useLobbyStore();

  const user = useAuthStore((s) => s.user);
  const joinRoomInStore = useRoomStore((s) => s.joinRoom);

  // Synchronize live rooms catalog & telemetry from Socket.io signaling server
  useEffect(() => {
    const socket = socketService.connect();

    socketService.fetchRooms().then((rooms) => {
      if (rooms && rooms.length > 0) {
        setRooms(rooms);
      }
    });

    socketService.fetchStats().then((stats) => {
      if (stats) {
        setLiveStats(stats);
      }
    });

    const handleRoomsUpdated = (updatedRooms: VoiceRoom[]) => {
      if (updatedRooms && Array.isArray(updatedRooms)) {
        setRooms(updatedRooms);

        // Also update current active room if currently inside one
        const activeRoom = useRoomStore.getState().currentRoom;
        if (activeRoom) {
          const matchingUpdated = updatedRooms.find((r) => r.id === activeRoom.id);
          if (matchingUpdated) {
            const currentUser = useAuthStore.getState().user;
            const updatedParticipants = [...matchingUpdated.participants];
            if (currentUser && !updatedParticipants.some((p) => p.id === currentUser.id)) {
              const myParticipant = activeRoom.participants.find((p) => p.id === currentUser.id);
              if (myParticipant) {
                updatedParticipants.unshift(myParticipant);
              }
            }
            useRoomStore.setState({
              currentRoom: {
                ...activeRoom,
                currentSlots: Math.max(matchingUpdated.currentSlots, updatedParticipants.length),
                hasFreeSeats: matchingUpdated.hasFreeSeats,
                participants: updatedParticipants.length > 0 ? updatedParticipants : activeRoom.participants,
              },
            });
          }
        }
      }
    };

    const handleStatsUpdated = (stats: any) => {
      if (stats) {
        setLiveStats(stats);
      }
    };

    socket.on("rooms:updated", handleRoomsUpdated);
    socket.on("stats:updated", handleStatsUpdated);

    return () => {
      socket.off("rooms:updated", handleRoomsUpdated);
      socket.off("stats:updated", handleStatsUpdated);
    };
  }, [setRooms, setLiveStats]);

  // SWR configuration with API_PATHS
  const { data: serverRooms, mutate } = useSWR<VoiceRoom[]>(API_PATHS.ROOMS.LIST, {
    fallbackData: storeRooms,
  });

  const roomsList = serverRooms || storeRooms;

  // Filter computation
  const filteredRooms = useMemo(() => {
    return roomsList.filter((room) => {
      // Language filter
      if (selectedLanguage !== Language.ALL && room.language !== selectedLanguage) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = room.title.toLowerCase().includes(query);
        const matchesLang = room.language.toLowerCase().includes(query);
        const matchesTag = room.tags.some((t) => t.toLowerCase().includes(query));
        const matchesHost = room.host.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesLang && !matchesTag && !matchesHost) {
          return false;
        }
      }

      // Filter pills
      if (activeFilter === "free-seats" && !room.hasFreeSeats) return false;
      if (activeFilter === "beginner" && !room.isBeginnerFriendly) return false;
      if (activeFilter === "native" && !room.hasNativeSpeaker) return false;

      return true;
    });
  }, [roomsList, selectedLanguage, searchQuery, activeFilter]);

  // Create room helper
  const createRoom = async (input: CreateRoomInput, hostUser: any) => {
    let levelLabel = "All Levels Welcome";
    if (input.cefrLevel === CEFRLevel.A1 || input.cefrLevel === CEFRLevel.A2)
      levelLabel = "Beginner Friendly";
    else if (input.cefrLevel === CEFRLevel.B1 || input.cefrLevel === CEFRLevel.B2)
      levelLabel = "Intermediate";
    else if (input.cefrLevel === CEFRLevel.C1 || input.cefrLevel === CEFRLevel.C2)
      levelLabel = "Advanced";
    else if (input.cefrLevel === CEFRLevel.NATIVE) levelLabel = "Native Speakers";

    const newRoom: VoiceRoom = {
      id: `room-${Date.now()}`,
      title: input.title.trim(),
      topic: input.title.trim(),
      language: input.language,
      flag: LANGUAGE_FLAGS[input.language] || "🌐",
      cefrLevel: input.cefrLevel,
      levelLabel,
      maxSlots: input.maxSlots,
      currentSlots: 1,
      tags: [input.topicTag],
      status: RoomStatus.LIVE,
      startedAt: new Date().toISOString(),
      activeSinceMinutes: 1,
      hasFreeSeats: true,
      isBeginnerFriendly: input.isBeginnerFriendly,
      hasNativeSpeaker: false,
      isLive: true,
      host: hostUser,
      participants: [
        {
          ...hostUser,
          isHost: true,
          isSpeaking: false,
          isMuted: false,
          isDeafened: false,
          handRaised: false,
        },
      ],
      messages: [],
    };

    // Optimistic local update & socket broadcast to all peers
    addRoom(newRoom);
    socketService.createRoom(newRoom);
    joinRoomInStore(newRoom, hostUser);
    mutate([newRoom, ...roomsList], false);
    return newRoom;
  };

  const joinRoom = (room: VoiceRoom) => {
    joinRoomInStore(room, user);
  };

  return {
    rooms: filteredRooms,
    totalRoomsCount: roomsList.length,
    searchQuery,
    selectedLanguage,
    activeFilter,
    liveStats,
    setSearchQuery,
    setSelectedLanguage,
    setActiveFilter,
    createRoom,
    joinRoom,
    refreshRooms: () => mutate(),
  };
}
