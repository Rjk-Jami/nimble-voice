/**
 * Core normalized lobby store reducers and state management.
 * Pure ESM module usable in both browser (via Next.js/Zustand) and Node test runners.
 */

export function reduceMergeServerRooms(state, serverRooms) {
  if (!Array.isArray(serverRooms)) return state;

  const nextRooms = { ...state.roomsById };
  const nextVersions = { ...state.roomVersions };

  for (const serverRoom of serverRooms) {
    if (!serverRoom || !serverRoom.id) continue;

    // 1. Tombstone check: Never resurrect closed rooms
    if (state.closedRooms?.[serverRoom.id]) {
      continue;
    }

    const existing = nextRooms[serverRoom.id];
    const existingVer = nextVersions[serverRoom.id] ?? 0;

    // 2. If room has active socket updates (version > 0), preserve live fields
    if (existing && existingVer > 0) {
      nextRooms[serverRoom.id] = {
        ...serverRoom,
        currentSlots: existing.currentSlots,
        maxSlots: existing.maxSlots,
        hasFreeSeats: existing.hasFreeSeats,
        status: existing.status,
        participants: existing.participants || serverRoom.participants,
      };
    } else {
      nextRooms[serverRoom.id] = serverRoom;
      if (nextVersions[serverRoom.id] === undefined) {
        nextVersions[serverRoom.id] = 0;
      }
    }
  }

  const roomsList = Object.values(nextRooms);
  return {
    ...state,
    roomsById: nextRooms,
    roomVersions: nextVersions,
    rooms: roomsList,
  };
}

export function reduceApplyRoomCreated(state, room, version) {
  if (!room || !room.id) return state;

  const nextClosed = { ...(state.closedRooms || {}) };
  // If closedRooms has this ID, clear tombstone (recreated)
  if (nextClosed[room.id]) {
    delete nextClosed[room.id];
  }

  const currentVer = state.roomVersions?.[room.id] ?? 0;
  const targetVer = version !== undefined ? version : Math.max(1, currentVer + 1);

  const nextRooms = {
    ...state.roomsById,
    [room.id]: room,
  };

  const nextVersions = {
    ...state.roomVersions,
    [room.id]: targetVer,
  };

  return {
    ...state,
    roomsById: nextRooms,
    roomVersions: nextVersions,
    closedRooms: nextClosed,
    rooms: Object.values(nextRooms),
  };
}

export function reduceApplyRoomUpdated(state, roomId, updates, version) {
  if (!roomId || !updates) return state;

  // Never update a tombstoned room
  if (state.closedRooms?.[roomId]) {
    return state;
  }

  const currentVer = state.roomVersions?.[roomId] ?? 0;
  if (version !== undefined && version <= currentVer) {
    // Reject stale or out-of-order delta
    return state;
  }

  const existing = state.roomsById?.[roomId];
  if (!existing) {
    return state;
  }

  const nextVer = version !== undefined ? version : currentVer + 1;
  const updatedRoom = {
    ...existing,
    ...updates,
  };

  const nextRooms = {
    ...state.roomsById,
    [roomId]: updatedRoom,
  };

  const nextVersions = {
    ...state.roomVersions,
    [roomId]: nextVer,
  };

  return {
    ...state,
    roomsById: nextRooms,
    roomVersions: nextVersions,
    rooms: Object.values(nextRooms),
  };
}

export function reduceApplyRoomDeleted(state, roomId, version) {
  if (!roomId) return state;

  const nextRooms = { ...state.roomsById };
  delete nextRooms[roomId];

  const currentVer = state.roomVersions?.[roomId] ?? 0;
  const nextVer = version !== undefined ? version : currentVer + 1;

  const nextClosed = {
    ...(state.closedRooms || {}),
    [roomId]: true,
  };

  const nextVersions = {
    ...state.roomVersions,
    [roomId]: nextVer,
  };

  return {
    ...state,
    roomsById: nextRooms,
    roomVersions: nextVersions,
    closedRooms: nextClosed,
    rooms: Object.values(nextRooms),
  };
}

export function createLobbyStore(initial = {}) {
  let state = {
    roomsById: {},
    roomVersions: {},
    closedRooms: {},
    onlineCount: null,
    searchQuery: "",
    selectedLanguage: "all",
    activeFilter: "active",
    rooms: [],
    ...initial,
  };

  const listeners = new Set();
  const getState = () => state;
  const setState = (updater) => {
    state = typeof updater === "function" ? updater(state) : { ...state, ...updater };
    listeners.forEach((l) => l(state));
  };

  return {
    getState,
    setState,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    mergeServerRooms: (serverRooms) => setState((s) => reduceMergeServerRooms(s, serverRooms)),
    applyRoomCreated: (room, version) => setState((s) => reduceApplyRoomCreated(s, room, version)),
    applyRoomUpdated: (roomId, updates, version) =>
      setState((s) => reduceApplyRoomUpdated(s, roomId, updates, version)),
    applyRoomDeleted: (roomId, version) => setState((s) => reduceApplyRoomDeleted(s, roomId, version)),
    setOnlineCount: (onlineCount) => setState({ onlineCount }),
    setSearchQuery: (searchQuery) => setState({ searchQuery }),
    setSelectedLanguage: (selectedLanguage) => setState({ selectedLanguage }),
    setActiveFilter: (activeFilter) => setState({ activeFilter }),
  };
}
