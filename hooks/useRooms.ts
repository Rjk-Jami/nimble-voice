"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { API_PATHS } from "@/lib/apiPaths";
import { useLobbyStore, useRoomStore } from "@/stores";
import { VoiceRoom } from "@/types";
import { Language, CEFRLevel, RoomStatus } from "@/enums";
import { CreateRoomInput } from "@/schemas";
import { LANGUAGE_FLAGS } from "@/enums";

export function useRooms() {
  const {
    rooms: storeRooms,
    searchQuery,
    selectedLanguage,
    activeFilter,
    liveStats,
    setSearchQuery,
    setSelectedLanguage,
    setActiveFilter,
    addRoom,
  } = useLobbyStore();

  const joinRoomInStore = useRoomStore((s) => s.joinRoom);

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

    // Optimistic update
    addRoom(newRoom);
    joinRoomInStore(newRoom, hostUser.id);
    mutate([newRoom, ...roomsList], false);
    return newRoom;
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
    joinRoom: joinRoomInStore,
    refreshRooms: () => mutate(),
  };
}
