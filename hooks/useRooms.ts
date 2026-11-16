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
import type {
  PresenceDTO,
  RoomDeletedDTO,
  RoomLobbyUpdateDTO,
  RoomSettingsUpdatedDTO,
  RoomSummaryDTO,
  ServerEventEnvelope,
  VoiceSpeakingChangedDTO,
} from "@/types/socket";

export function useRooms() {
  const roomsById = useLobbyStore((s) => s.roomsById);
  const onlineCount = useLobbyStore((s) => s.onlineCount);
  const searchQuery = useLobbyStore((s) => s.searchQuery);
  const selectedLanguage = useLobbyStore((s) => s.selectedLanguage);
  const activeFilter = useLobbyStore((s) => s.activeFilter);

  const mergeServerRooms = useLobbyStore((s) => s.mergeServerRooms);
  const applyRoomCreated = useLobbyStore((s) => s.applyRoomCreated);
  const applyRoomUpdated = useLobbyStore((s) => s.applyRoomUpdated);
  const applyRoomDeleted = useLobbyStore((s) => s.applyRoomDeleted);
  const setOnlineCount = useLobbyStore((s) => s.setOnlineCount);
  const setSearchQuery = useLobbyStore((s) => s.setSearchQuery);
  const setSelectedLanguage = useLobbyStore((s) => s.setSelectedLanguage);
  const setActiveFilter = useLobbyStore((s) => s.setActiveFilter);

  const user = useAuthStore((s) => s.user);
  const joinRoomInStore = useRoomStore((s) => s.joinRoom);
  const setCurrentRoom = useRoomStore((s) => s.setCurrentRoom);

  // 1. SWR Cold Bootstrap & Reconnect Revalidation (Zero Polling)
  const { data: serverResponse, mutate } = useSWR<any>(API_PATHS.ROOMS.LIST, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
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

  // Merge server rooms monotonically without clobbering active updates or resurrecting deleted rooms
  useEffect(() => {
    if (serverRooms && Array.isArray(serverRooms)) {
      mergeServerRooms(serverRooms);
    }
  }, [serverRooms, mergeServerRooms]);

  // 2. Real-time Socket.IO global presence and lobby room state updates
  useEffect(() => {
    socketService.connect();
    socketService.joinLobby().catch(() => { });

    const handlePresence = (payload: PresenceDTO) => {
      if (payload && typeof payload.onlineCount === "number") {
        setOnlineCount(payload.onlineCount);
      }
    };

    const handleRoomCreated = (
      payload: RoomSummaryDTO,
      env?: ServerEventEnvelope<RoomSummaryDTO, "lobby.room_created">
    ) => {
      if (!payload?.id) return;
      applyRoomCreated(normalizeRoom(payload), env?.version);
    };

    const handleRoomUpdated = (
      payload: RoomLobbyUpdateDTO,
      env?: ServerEventEnvelope<RoomLobbyUpdateDTO, "lobby.room_updated">
    ) => {
      if (!payload?.roomId) return;
      const updates: Partial<VoiceRoom> = {};
      if (typeof payload.currentSlots === "number") {
        updates.currentSlots = payload.currentSlots;
      }
      if (typeof payload.maxSlots === "number" && payload.maxSlots > 0) {
        updates.maxSlots = payload.maxSlots;
      }
      if (typeof payload.hasFreeSeats === "boolean") {
        updates.hasFreeSeats = payload.isLocked ? false : payload.hasFreeSeats;
      } else if (typeof payload.isLocked === "boolean" && payload.isLocked) {
        updates.hasFreeSeats = false;
      }
      if (typeof payload.status === "string" && payload.status.length > 0) {
        updates.status = payload.status as RoomStatus;
      }
      applyRoomUpdated(payload.roomId, updates, env?.version);
    };

    const handleRoomDeleted = (
      payload: RoomDeletedDTO,
      env?: ServerEventEnvelope<RoomDeletedDTO, "lobby.room_deleted">
    ) => {
      if (!payload?.roomId) return;
      applyRoomDeleted(payload.roomId, env?.version);
    };

    const handleRoomSettingsUpdated = (
      payload: RoomSettingsUpdatedDTO,
      env?: ServerEventEnvelope<RoomSettingsUpdatedDTO, "room.settings_updated">
    ) => {
      if (!payload?.roomId) return;
      const updates: Partial<VoiceRoom> = {};
      if (typeof payload.title === "string") updates.title = payload.title;
      if (typeof payload.topic === "string") updates.topic = payload.topic;
      if (typeof payload.status === "string") {
        updates.status = payload.status as RoomStatus;
      }
      if (typeof payload.maxSlots === "number" && payload.maxSlots > 0) {
        updates.maxSlots = payload.maxSlots;
      }
      if (typeof payload.hasFreeSeats === "boolean") {
        updates.hasFreeSeats = payload.hasFreeSeats;
      }
      applyRoomUpdated(payload.roomId, updates, env?.version);
      useRoomStore.getState().updateRoomSettings(payload.roomId, updates);
    };

    const handleSpeakingChanged = (payload: VoiceSpeakingChangedDTO) => {
      if (!payload?.roomId || !payload?.userId) return;
      const room = useLobbyStore.getState().roomsById[payload.roomId];
      if (room && room.participants) {
        const updatedParticipants = room.participants.map((p) =>
          p.id === payload.userId ? { ...p, isSpeaking: payload.isSpeaking } : p
        );
        applyRoomUpdated(payload.roomId, { participants: updatedParticipants });
      }
    };

    const unsubs: Array<() => void> = [
      socketService.onEvent("presence.snapshot", handlePresence),
      socketService.onEvent("presence.updated", handlePresence),
      socketService.onEvent("lobby.room_created", handleRoomCreated),
      socketService.onEvent("lobby.room_updated", handleRoomUpdated),
      socketService.onEvent("lobby.room_deleted", handleRoomDeleted),
      socketService.onEvent("room.settings_updated", handleRoomSettingsUpdated),
      socketService.onEvent("voice.speaking_changed", handleSpeakingChanged),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
      socketService.leaveLobby().catch(() => { });
    };
  }, [
    setOnlineCount,
    applyRoomCreated,
    applyRoomUpdated,
    applyRoomDeleted,
  ]);

  // Guaranteed flat array of VoiceRoom items derived from normalized roomsById
  const roomsList = useMemo<VoiceRoom[]>(() => {
    return Object.values(roomsById);
  }, [roomsById]);

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

  // Derived live stats for backward compatibility with LobbyView
  const liveStats = useMemo(() => {
    const uniqueLanguages = new Set<string>();
    roomsList.forEach((r) => {
      if (r.language) uniqueLanguages.add(r.language);
    });
    return {
      onlineCount: onlineCount ?? 0,
      activeRoomsCount: roomsList.length,
      liveLanguagesCount: uniqueLanguages.size,
    };
  }, [onlineCount, roomsList]);

  // Helper to ensure guest JWT exists before calling protected endpoints
  const ensureAuthToken = async () => {
    if (typeof window === "undefined") return null;
    let token =
      sessionStorage.getItem("nimble_guest_token") ||
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
          sessionStorage.setItem("nimble_guest_token", safeToken);
          socketService.connect();
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

    let createdRoom: VoiceRoom = newRoom;

    // Persist to backend database via Go REST API
    try {
      await ensureAuthToken();
      const res: any = await apiClient.post(API_PATHS.ROOMS.CREATE, input);
      if (res?.room) {
        const normalized = normalizeRoom(res.room);
        createdRoom = {
          ...normalized,
          host: hostUser ? normalizeUser(hostUser) : normalized.host,
          participants: [
            {
              ...(hostUser ? normalizeUser(hostUser) : normalized.host),
              isHost: true,
              isSpeaking: false,
              isMuted: false,
              isDeafened: false,
              handRaised: false,
            },
          ],
        };
      }
    } catch (err) {
      console.warn("Backend room persistence notice:", err);
    }

    // Bind LiveVoiceRoom / WebRTC / chat to the persisted DB room ID
    applyRoomCreated(createdRoom);
    setCurrentRoom(createdRoom);
    joinRoomInStore(createdRoom, hostUser);
    mutate(
      (curr: any) => {
        if (curr && Array.isArray(curr.rooms)) {
          return {
            ...curr,
            rooms: [
              createdRoom,
              ...curr.rooms.filter((r: any) => r.id !== createdRoom.id),
            ],
          };
        }
        if (Array.isArray(curr)) {
          return [
            createdRoom,
            ...curr.filter((r: any) => r.id !== createdRoom.id),
          ];
        }
        return { rooms: [createdRoom, ...roomsList] };
      },
      false
    );

    return createdRoom;
  };

  const joinRoom = async (room: VoiceRoom) => {
    joinRoomInStore(room, user);
    try {
      await ensureAuthToken();
      await apiClient.post(API_PATHS.ROOMS.JOIN(room.id));
    } catch (err: any) {
      if (err?.response?.status === 404) {
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
