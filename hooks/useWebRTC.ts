"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { webrtcMeshManager, RemotePeerMedia } from "@/lib/webrtc";
import type { IceDiagnosticState } from "@/lib/ice";
import { normalizeParticipant } from "@/lib/normalize";
import { socketService } from "@/lib/socket";
import { useVoiceStore, useRoomStore, useAuthStore } from "@/stores";
import { Participant } from "@/types";
import type {
  RoomMemberJoinedDTO,
  RoomMemberLeftDTO,
  RoomSnapshotDTO,
  ScreenShareDTO,
  VoiceMuteChangedDTO,
  VoiceSpeakingChangedDTO,
} from "@/types/socket";

export function useWebRTC(roomId?: string) {
  const user = useAuthStore((s) => s.user);
  const {
    isMuted,
    isDeafened,
    handRaised,
    setLocalStream,
    setSpeaking,
    setAudioLevel,
    setNetworkLatency,
  } = useVoiceStore();

  const { addParticipant, removeParticipant, updateParticipant } = useRoomStore();

  const [localStream, setStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeerMedia[]>([]);
  const [remoteScreenStream, setRemoteScreenStream] = useState<{ userId: string; stream: MediaStream } | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [iceDiagnostic, setIceDiagnostic] = useState<IceDiagnosticState | null>(null);
  const [isRetryingIce, setIsRetryingIce] = useState(false);
  const [iceDiagnosticDismissed, setIceDiagnosticDismissed] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeakingStateRef = useRef<boolean>(false);
  const lastIceDiagnosticModeRef = useRef<IceDiagnosticState["mode"] | null>(null);
  const mountedRef = useRef<boolean>(false);
  const hasJoinedRoomRef = useRef<boolean>(false);
  const lastSyncedVoiceRef = useRef<{
    isMuted: boolean;
    isDeafened: boolean;
    handRaised: boolean;
  } | null>(null);

  const applyIceDiagnostic = useCallback((diagnostic: IceDiagnosticState | null) => {
    if (!diagnostic) {
      lastIceDiagnosticModeRef.current = null;
      setIceDiagnostic(null);
      setIceDiagnosticDismissed(false);
      return;
    }
    if (lastIceDiagnosticModeRef.current !== diagnostic.mode) {
      setIceDiagnosticDismissed(false);
    }
    lastIceDiagnosticModeRef.current = diagnostic.mode;
    setIceDiagnostic(diagnostic);
  }, []);

  // 1. Initialize WebRTC and Socket when joining a room
  useEffect(() => {
    if (!roomId || !user) return;

    let mounted = true;
    mountedRef.current = true;
    hasJoinedRoomRef.current = false;
    lastSyncedVoiceRef.current = null;
    setHasJoinedRoom(false);
    setConnectionStatus("connecting");

    const setupMesh = async () => {
      const unsubs: Array<() => void> = [];
      let latencyTimer: ReturnType<typeof setInterval> | null = null;

      const cleanupListeners = () => {
        if (latencyTimer) {
          clearInterval(latencyTimer);
          latencyTimer = null;
        }
        while (unsubs.length > 0) {
          const unsub = unsubs.pop();
          try {
            unsub?.();
          } catch {}
        }
      };

      try {
        webrtcMeshManager.onIceDiagnostic = (diagnostic) => {
          if (!mounted) return;
          applyIceDiagnostic(diagnostic);
        };

        const socket = socketService.getSocket();
        setIsSocketConnected(socket.connected);

        const onConnect = () => setIsSocketConnected(true);
        const onDisconnect = () => setIsSocketConnected(false);
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        unsubs.push(() => {
          socket.off("connect", onConnect);
          socket.off("disconnect", onDisconnect);
        });

        // Register canonical room/voice/screen_share listeners BEFORE room.join so initial room.snapshot is never missed
        unsubs.push(
          socketService.onEvent("room.snapshot", (data: RoomSnapshotDTO) => {
            if (!mounted || (data.roomId && data.roomId !== roomId)) return;
            if (Array.isArray(data.peers)) {
              data.peers.forEach((peer) => {
                if (!peer?.participant || peer.userId === user.id) return;
                const normalized = normalizeParticipant(peer);
                addParticipant({
                  ...normalized,
                  isHost: Boolean(peer.participant.isHost),
                });
              });
            }
            if (data.room) {
              useRoomStore.getState().updateRoomSettings(roomId, {
                hasFreeSeats: data.isLocked ? false : data.room.hasFreeSeats,
              });
            } else if (data.isLocked) {
              useRoomStore.getState().updateRoomSettings(roomId, {
                hasFreeSeats: false,
              });
            }
          })
        );

        unsubs.push(
          socketService.onEvent("room.member_joined", (data: RoomMemberJoinedDTO) => {
            if (!mounted || data.roomId !== roomId || data.userId === user.id) return;
            const participant = normalizeParticipant(data);
            addParticipant({
              ...participant,
              isHost: Boolean(data.participant?.isHost),
            });
          })
        );

        unsubs.push(
          socketService.onEvent("room.member_left", (data: RoomMemberLeftDTO) => {
            if (!mounted || data.roomId !== roomId) return;
            setRemotePeers((prev) => prev.filter((p) => p.socketId !== data.socketId));
            setRemoteScreenStream((prev) => (prev?.userId === data.userId ? null : prev));
            removeParticipant(data.userId);
          })
        );

        unsubs.push(
          socketService.onEvent("voice.speaking_changed", (data: VoiceSpeakingChangedDTO) => {
            if (!mounted || data.roomId !== roomId) return;
            setSpeaking(data.userId, data.isSpeaking);
            setAudioLevel(data.userId, data.level);
            updateParticipant(data.userId, { isSpeaking: data.isSpeaking, audioLevel: data.level });
          })
        );

        unsubs.push(
          socketService.onEvent("voice.mute_changed", (data: VoiceMuteChangedDTO) => {
            if (!mounted || data.roomId !== roomId) return;
            const updates: Partial<Participant> = { isMuted: data.isMuted };
            if (typeof data.isDeafened === "boolean") updates.isDeafened = data.isDeafened;
            if (typeof data.handRaised === "boolean") updates.handRaised = data.handRaised;
            updateParticipant(data.userId, updates);
          })
        );

        const handleScreenShare = (data: ScreenShareDTO, isSharing: boolean) => {
          if (!mounted || data.roomId !== roomId) return;
          updateParticipant(data.userId, { isScreenSharing: isSharing });
          if (!isSharing) {
            setRemoteScreenStream((prev) => (prev?.userId === data.userId ? null : prev));
          }
        };

        unsubs.push(
          socketService.onEvent("screen_share.started", (data: ScreenShareDTO) =>
            handleScreenShare(data, true)
          )
        );
        unsubs.push(
          socketService.onEvent("screen_share.stopped", (data: ScreenShareDTO) =>
            handleScreenShare(data, false)
          )
        );

        await webrtcMeshManager.joinRoom(roomId, user);

        if (!mounted) {
          cleanupListeners();
          return;
        }
        const stream = webrtcMeshManager.getLocalStream();
        if (!stream?.getAudioTracks().some((track) => track.readyState === "live")) {
          throw new Error("No live microphone audio track is available.");
        }
        setMediaError(null);
        setStream(stream);
        setLocalStream(stream);
        setConnectionStatus("connected");
        setIsSocketConnected(socket.connected);

        webrtcMeshManager.onAudioPlaybackBlocked = setAudioPlaybackBlocked;

        // Remote stream callback (audio)
        webrtcMeshManager.onRemoteStream = (peer) => {
          if (!mounted) return;
          setRemotePeers((prev) => {
            const filtered = prev.filter((p) => p.socketId !== peer.socketId);
            return [...filtered, peer];
          });
        };

        // Remote screen stream callback (video)
        webrtcMeshManager.onRemoteScreenStream = (data) => {
          if (!mounted) return;
          if (data.stream) {
            setRemoteScreenStream({ userId: data.userId, stream: data.stream });
            updateParticipant(data.userId, { isScreenSharing: true });
          } else {
            setRemoteScreenStream((prev) => (prev?.userId === data.userId ? null : prev));
            updateParticipant(data.userId, { isScreenSharing: false });
          }
        };

        // Peer disconnected callback
        webrtcMeshManager.onPeerDisconnected = (socketId, peerUserId) => {
          if (!mounted) return;
          setRemotePeers((prev) => prev.filter((p) => p.socketId !== socketId));
          setRemoteScreenStream((prev) => (prev?.userId === peerUserId ? null : prev));
          removeParticipant(peerUserId);
        };

        // Remote peer voice speaking detector callback (real-time Web Audio API recognition)
        webrtcMeshManager.onPeerSpeaking = (socketId, peerUserId, speaking, volume) => {
          if (!mounted) return;
          const targetId = peerUserId || socketId;
          if (targetId) {
            setSpeaking(targetId, speaking);
            setAudioLevel(targetId, volume);
            updateParticipant(targetId, { isSpeaking: speaking, audioLevel: volume });
          }
          if (socketId && peerUserId && socketId !== peerUserId) {
            setSpeaking(socketId, speaking);
            setAudioLevel(socketId, volume);
          }
        };

        const {
          isMuted: curMuted,
          isDeafened: curDeafened,
          handRaised: curHand,
        } = useVoiceStore.getState();

        // Ensure local user is represented in participants list
        addParticipant({
          ...user,
          isHost: useRoomStore.getState().isHost,
          isSpeaking: false,
          isMuted: curMuted,
          isDeafened: curDeafened,
          handRaised: curHand,
        });

        // Mark room joined ONLY after room.join command.ack resolved and emit initial voice state once
        lastSyncedVoiceRef.current = {
          isMuted: curMuted,
          isDeafened: curDeafened,
          handRaised: curHand,
        };
        hasJoinedRoomRef.current = true;
        setHasJoinedRoom(true);
        socketService
          .sendVoiceState(roomId, {
            isMuted: curMuted,
            isDeafened: curDeafened,
            handRaised: curHand,
          })
          .catch(() => {});

        // Measure network mesh latency periodically
        latencyTimer = setInterval(async () => {
          if (!mounted) return;
          const latency = await socketService.measureLatency();
          setNetworkLatency(latency);
        }, 5000);

        return cleanupListeners;
      } catch (err) {
        cleanupListeners();
        console.error("[useWebRTC] Failed to initialize WebRTC mesh:", err);
        if (mounted) {
          const error = err instanceof Error ? err : new Error("Unable to initialize microphone.");
          setMediaError(error.name === "NotAllowedError" || error.name === "PermissionDeniedError"
            ? "Microphone permission was denied. Allow microphone access in your browser and try again."
            : error.message);
          setConnectionStatus("idle");
        }
      }
    };

    const cleanupPromise = setupMesh();

    return () => {
      mounted = false;
      mountedRef.current = false;
      hasJoinedRoomRef.current = false;
      lastSyncedVoiceRef.current = null;
      setHasJoinedRoom(false);
      cleanupPromise.then((cleanupFn) => cleanupFn && cleanupFn());
      webrtcMeshManager.destroy();
      setStream(null);
      setLocalStream(null);
      setRemotePeers([]);
      setConnectionStatus("idle");
      lastIceDiagnosticModeRef.current = null;
      setIceDiagnostic(null);
      setIceDiagnosticDismissed(false);
      setIsRetryingIce(false);
    };
  }, [roomId, user?.id, applyIceDiagnostic]);

  // 2. React to isMuted changes (gated on hasJoinedRoom)
  useEffect(() => {
    webrtcMeshManager.setMuted(isMuted);
    if (!hasJoinedRoom || !roomId || !user?.id) return;
    updateParticipant(user.id, { isMuted });
    if (lastSyncedVoiceRef.current?.isMuted === isMuted) return;
    const { isDeafened: curDeafened, handRaised: curHand } = useVoiceStore.getState();
    lastSyncedVoiceRef.current = {
      isMuted,
      isDeafened: curDeafened,
      handRaised: curHand,
    };
    socketService
      .sendVoiceState(roomId, {
        isMuted,
        isDeafened: curDeafened,
        handRaised: curHand,
      })
      .catch(() => {});
  }, [isMuted, hasJoinedRoom, roomId, user?.id, updateParticipant]);

  // 3. React to isDeafened changes (gated on hasJoinedRoom)
  useEffect(() => {
    webrtcMeshManager.setDeafened(isDeafened);
    if (!hasJoinedRoom || !roomId || !user?.id) return;
    updateParticipant(user.id, { isDeafened });
    if (lastSyncedVoiceRef.current?.isDeafened === isDeafened) return;
    const { isMuted: curMuted, handRaised: curHand } = useVoiceStore.getState();
    lastSyncedVoiceRef.current = {
      isMuted: curMuted,
      isDeafened,
      handRaised: curHand,
    };
    socketService
      .sendVoiceState(roomId, {
        isMuted: curMuted,
        isDeafened,
        handRaised: curHand,
      })
      .catch(() => {});
  }, [isDeafened, hasJoinedRoom, roomId, user?.id, updateParticipant]);

  // 4. React to handRaised changes (gated on hasJoinedRoom)
  useEffect(() => {
    if (!hasJoinedRoom || !roomId || !user?.id) return;
    updateParticipant(user.id, { handRaised });
    if (lastSyncedVoiceRef.current?.handRaised === handRaised) return;
    const { isMuted: curMuted, isDeafened: curDeafened } = useVoiceStore.getState();
    lastSyncedVoiceRef.current = {
      isMuted: curMuted,
      isDeafened: curDeafened,
      handRaised,
    };
    socketService
      .sendVoiceState(roomId, {
        isMuted: curMuted,
        isDeafened: curDeafened,
        handRaised,
      })
      .catch(() => {});
  }, [handRaised, hasJoinedRoom, roomId, user?.id, updateParticipant]);

  // 5. Real-time microphone audio level analyzer and speaking detector
  useEffect(() => {
    if (!localStream || !hasJoinedRoom || isMuted || isDeafened || !user?.id || !roomId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => { });
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      if (lastSpeakingStateRef.current && user?.id && roomId) {
        lastSpeakingStateRef.current = false;
        setSpeaking(user.id, false);
        setAudioLevel(user.id, 0);
        updateParticipant(user.id, { isSpeaking: false, audioLevel: 0 });
        if (hasJoinedRoomRef.current) {
          socketService.sendSpeaking(roomId, false, 0);
        }
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.45;

      const source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalizedVolume = Math.min(100, Math.round((avg / 128) * 100));
        const speakingNow = normalizedVolume > 12;

        setAudioLevel(user.id, normalizedVolume);

        if (speakingNow !== lastSpeakingStateRef.current) {
          lastSpeakingStateRef.current = speakingNow;
          setSpeaking(user.id, speakingNow);
          if (hasJoinedRoomRef.current) {
            socketService.sendSpeaking(roomId, speakingNow, normalizedVolume);
          }
          updateParticipant(user.id, { isSpeaking: speakingNow, audioLevel: normalizedVolume });
        }
      }, 60);
    } catch (e) {
      // AudioContext fallback
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, [localStream, hasJoinedRoom, isMuted, isDeafened, user?.id, roomId, setSpeaking, setAudioLevel, updateParticipant]);

  const handleShareScreen = useCallback(
    async (stream: MediaStream | null) => {
      await webrtcMeshManager.shareScreen(stream);
    },
    [roomId]
  );

  const handleSwitchAudioInput = useCallback(async (deviceId: string) => {
    await webrtcMeshManager.switchAudioInput(deviceId);
  }, []);

  const retryIceLookup = useCallback(async () => {
    setIsRetryingIce(true);
    try {
      const diagnostic = await webrtcMeshManager.refreshIceConfiguration(true);
      if (!mountedRef.current) return;
      lastIceDiagnosticModeRef.current = diagnostic?.mode ?? null;
      setIceDiagnostic(diagnostic);
      setIceDiagnosticDismissed(false);
    } finally {
      if (mountedRef.current) {
        setIsRetryingIce(false);
      }
    }
  }, []);

  const dismissIceDiagnostic = useCallback(() => {
    setIceDiagnosticDismissed(true);
  }, []);

  return {
    localStream,
    remotePeers,
    remoteScreenStream,
    isSocketConnected,
    connectionStatus,
    mediaError,
    audioPlaybackBlocked,
    iceDiagnostic: iceDiagnosticDismissed ? null : iceDiagnostic,
    isRetryingIce,
    retryIceLookup,
    dismissIceDiagnostic,
    resumeRemoteAudio: () => webrtcMeshManager.resumeRemoteAudio(),
    shareScreen: handleShareScreen,
    switchAudioInput: handleSwitchAudioInput,
  };
}
