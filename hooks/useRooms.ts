"use client";

import { CEFRLevel, Language, LANGUAGE_FLAGS, RoomStatus } from "@/enums";
import { API_PATHS } from "@/lib/apiPaths";
import { apiClient } from "@/lib/axios";
import { normalizeRoom, normalizeUser } from "@/lib/normalize";
import { CreateRoomInput } from "@/schemas";
import { useAuthStore, useLobbyStore, useRoomStore } from "@/stores";
import { VoiceRoom } from "@/types";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
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
    updateRoom,
    removeRoom,
  } = useLobbyStore();

  const user = useAuthStore((s) => s.user);
  const joinRoomInStore = useRoomStore((s) => s.joinRoom);

  // SWR synchronization for active rooms
  const { data: serverResponse, mutate } = useSWR<any>(API_PATHS.ROOMS.LIST, {
    refreshInterval: 10000,
  });

  // Extract raw rooms array from backend { rooms: [...], pagination: {...} } or array
  const serverRooms = useMemo<VoiceRoom[] | null>(() => {
    if (!serverResponse) return null;
    const rawList = Array.isArray(serverResponse)
      ? serverResponse
      : Array.isArray(serverResponse?.rooms)
      ? serverResponse.rooms
      : null;
    return rawList ? rawList.map(normalizeRoom) : null;
  }, [serverResponse]);

  // Sync server rooms to lobby store
  useEffect(() => {
    if (serverRooms && Array.isArray(serverRooms) && serverRooms.length > 0) {
      setRooms(serverRooms);
    }
  }, [serverRooms, setRooms]);

  // SWR synchronization for platform telemetry / live stats
  const { data: serverStats } = useSWR<any>(API_PATHS.NETWORK.STATS, {
    refreshInterval: 15000,
  });

  useEffect(() => {
    if (serverStats) {
      setLiveStats({
        onlineCount: serverStats.onlineCount ?? serverStats.online_users ?? 1,
        activeRoomsCount:
          serverStats.activeRoomsCount ??
          serverStats.active_rooms ??
          (serverRooms?.length || (Array.isArray(storeRooms) ? storeRooms.length : 0)),
        liveLanguagesCount:
          serverStats.liveLanguagesCount ??
          serverStats.active_languages ??
          1,
      });
    }
  }, [serverStats, setLiveStats, serverRooms, storeRooms]);

  // Real-time Socket.IO global presence and lobby room state updates
  useEffect(() => {
    const socket = socketService.connect();
    socketService.joinLobby();

    const handlePresenceUpdate = (payload: any) => {
      if (!payload) return;
      setLiveStats({
        onlineCount: payload.onlineCount ?? payload.online_count,
        activeRoomsCount: payload.activeRoomsCount ?? payload.active_rooms,
        liveLanguagesCount: payload.liveLanguagesCount ?? payload.live_languages,
      });
    };

    const handleRoomCreated = (payload: any) => {
      if (!payload) return;
      const raw = payload.room || payload;
      if (raw && (raw.id || raw.ID)) {
        addRoom(normalizeRoom(raw));
      }
    };

    const handleRoomUpdated = (payload: any) => {
      if (!payload) return;
      const roomId = payload.roomId || payload.room_id || payload.id || payload.ID;
      if (!roomId) return;
      const updates: Partial<VoiceRoom> = {};
      if (payload.currentSlots !== undefined) updates.currentSlots = payload.currentSlots;
      if (payload.current_slots !== undefined) updates.currentSlots = payload.current_slots;
      if (payload.hasFreeSeats !== undefined) updates.hasFreeSeats = payload.hasFreeSeats;
      if (payload.has_free_seats !== undefined) updates.hasFreeSeats = payload.has_free_seats;
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.participants !== undefined) updates.participants = payload.participants;
      updateRoom(roomId, updates);
    };

    const handleRoomDeleted = (payload: any) => {
      if (!payload) return;
      const roomId = payload.roomId || payload.room_id || payload.id || payload.ID;
      if (roomId) {
        removeRoom(roomId);
      }
    };

    socket.on("presence:update", handlePresenceUpdate);
    socket.on("lobby:room-created", handleRoomCreated);
    socket.on("lobby:room-updated", handleRoomUpdated);
    socket.on("lobby:room-deleted", handleRoomDeleted);

    return () => {
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("lobby:room-created", handleRoomCreated);
      socket.off("lobby:room-updated", handleRoomUpdated);
      socket.off("lobby:room-deleted", handleRoomDeleted);
      socketService.leaveLobby();
    };
  }, [setLiveStats, addRoom, updateRoom, removeRoom]);

  // Guaranteed flat array of VoiceRoom items for filtering
  const roomsList = useMemo<VoiceRoom[]>(() => {
    if (Array.isArray(serverRooms) && serverRooms.length > 0) {
      return serverRooms;
    }
    if (Array.isArray(storeRooms) && storeRooms.length > 0) {
      return storeRooms;
    }
    return [];
  }, [serverRooms, storeRooms]);

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

    // Optimistic local update
    addRoom(newRoom);
    joinRoomInStore(newRoom, hostUser);
    mutate(
      (curr: any) => {
        if (curr && Array.isArray(curr.rooms)) {
          return { ...curr, rooms: [newRoom, ...curr.rooms] };
        }
        if (Array.isArray(curr)) {
          return [newRoom, ...curr];
        }
        return { rooms: [newRoom, ...roomsList] };
      },
      false
    );

    // Persist to backend database via Go REST API
    try {
      await ensureAuthToken();
      const res: any = await apiClient.post(API_PATHS.ROOMS.CREATE, input);
      if (res?.room) {
        const normalized = normalizeRoom(res.room);
        newRoom.id = normalized.id;
      }
      mutate();
    } catch (err) {
      console.warn("Backend room persistence notice:", err);
    }

    return newRoom;
  };

  // Helper to ensure guest JWT exists before calling protected endpoints
  const ensureAuthToken = async () => {
    if (typeof window === "undefined") return null;
    let token =
      localStorage.getItem("token") ||
      localStorage.getItem("nimble_auth_token");
    if (!token) {
      try {
        const guestRes: any = await apiClient.post(API_PATHS.AUTH.GUEST_LOGIN, {
          name: user?.name || "Guest Learner",
          nativeLanguage: user?.nativeLanguage || "English",
          learningLanguage: user?.learningLanguage || "Spanish",
        });
        if (guestRes?.token) {
          const safeToken = String(guestRes.token);
          token = safeToken;
          localStorage.setItem("token", safeToken);
          localStorage.setItem("nimble_auth_token", safeToken);
          if (guestRes?.user) {
            useAuthStore.setState({
              user: normalizeUser(guestRes.user),
              isAuthenticated: false,
              isGuest: true,
            });
          }
        }
      } catch (err) {
        console.warn("Guest session init notice:", err);
      }
    }
    return token;
  };

  const joinRoom = async (room: VoiceRoom) => {
    joinRoomInStore(room, user);
    try {
      await ensureAuthToken();
      await apiClient.post(API_PATHS.ROOMS.JOIN(room.id));
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // If room is an initial local lobby room not yet in database, audio mesh connects directly
        console.info(
          `[Room] Room ${room.id} is active in local audio mesh mode.`
        );
      } else {
        console.warn("Backend room join notice:", err);
      }
    }
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
