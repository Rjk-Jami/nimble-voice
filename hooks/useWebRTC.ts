"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { webrtcMeshManager, RemotePeerMedia } from "@/lib/webrtc";
import { socketService } from "@/lib/socket";
import { useVoiceStore, useRoomStore, useAuthStore } from "@/stores";
import { User, Participant } from "@/types";

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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeakingStateRef = useRef<boolean>(false);

  // 1. Initialize WebRTC and Socket when joining a room
  useEffect(() => {
    if (!roomId || !user) return;

    let mounted = true;
    setConnectionStatus("connecting");

    const setupMesh = async () => {
      try {
        await webrtcMeshManager.joinRoom(roomId, user);

        if (!mounted) return;
        const stream = webrtcMeshManager.getLocalStream();
        if (!stream?.getAudioTracks().some((track) => track.readyState === "live")) {
          throw new Error("No live microphone audio track is available.");
        }
        setMediaError(null);
        setStream(stream);
        setLocalStream(stream);
        setConnectionStatus("connected");

        const socket = socketService.getSocket();
        setIsSocketConnected(socket.connected);

        const onConnect = () => setIsSocketConnected(true);
        const onDisconnect = () => setIsSocketConnected(false);
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

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

        // Socket: Existing peers in room with full voiceState (received by joiner)
        const onExistingPeers = ({ peers }: { peers: Array<{ socketId: string; userId: string; user: any; voiceState?: any }> }) => {
          if (!mounted || !Array.isArray(peers)) return;
          peers.forEach(({ userId, user: peerUser, voiceState }) => {
            if (!peerUser || userId === user?.id) return;
            const existingParticipant: Participant = {
              id: userId,
              name: peerUser.name || `User ${userId.slice(0, 4)}`,
              avatarUrl: peerUser.avatarUrl,
              location: peerUser.location || "Global",
              nativeLanguage: peerUser.nativeLanguage || "English",
              learningLanguage: peerUser.learningLanguage || "Spanish",
              isVerified: !!peerUser.isVerified,
              cefrPortfolio: peerUser.cefrPortfolio || {},
              karma: peerUser.karma || 0,
              hoursSpoken: peerUser.hoursSpoken || 0,
              streak: peerUser.streak || 1,
              isHost: !!peerUser.isHost,
              isSpeaking: false,
              isMuted: voiceState ? !!voiceState.isMuted : !!peerUser.isMuted,
              isDeafened: voiceState ? !!voiceState.isDeafened : !!peerUser.isDeafened,
              handRaised: voiceState ? !!voiceState.handRaised : !!peerUser.handRaised,
              isScreenSharing: voiceState ? !!voiceState.isScreenSharing : !!peerUser.isScreenSharing,
            };
            addParticipant(existingParticipant);
          });
        };
        socket.on("room:existing-peers", onExistingPeers);

        // Socket: User joined room (received by existing peers)
        const onUserJoined = ({ userId, user: newPeerUser }: { userId: string; user: any }) => {
          if (!mounted || !newPeerUser || userId === user?.id) return;
          console.log(`[useWebRTC] New user joined room: ${userId}`);
          const newParticipant: Participant = {
            id: userId,
            name: newPeerUser.name || `User ${userId.slice(0, 4)}`,
            avatarUrl: newPeerUser.avatarUrl,
            location: newPeerUser.location || "Global",
            nativeLanguage: newPeerUser.nativeLanguage || "English",
            learningLanguage: newPeerUser.learningLanguage || "Spanish",
            isVerified: !!newPeerUser.isVerified,
            cefrPortfolio: newPeerUser.cefrPortfolio || {},
            karma: newPeerUser.karma || 0,
            hoursSpoken: newPeerUser.hoursSpoken || 0,
            streak: newPeerUser.streak || 1,
            isHost: !!newPeerUser.isHost,
            isSpeaking: false,
            isMuted: false,
            isDeafened: false,
            handRaised: false,
          };
          addParticipant(newParticipant);
        };
        socket.on("room:user-joined", onUserJoined);

        // Ensure local user is represented in participants list
        if (user) {
          addParticipant({
            ...user,
            isSpeaking: false,
            isMuted,
            isDeafened,
            handRaised,
          });
        }

        // Socket: Dynamic Speaking Amplitude Broadcast
        const onSpeakingChanged = ({ userId, isSpeaking: speaking, level }: { userId: string; isSpeaking: boolean; level: number }) => {
          if (!mounted) return;
          setSpeaking(userId, speaking);
          setAudioLevel(userId, level);
          updateParticipant(userId, { isSpeaking: speaking, audioLevel: level });
        };
        socket.on("voice:speaking-changed", onSpeakingChanged);

        // Socket: Tactical Voice State Updates (Mute, Deafen, Hand)
        const onVoiceStateUpdated = ({ userId, isMuted: muted, isDeafened: deafened, handRaised: raised }: { userId: string; isMuted?: boolean; isDeafened?: boolean; handRaised?: boolean }) => {
          if (!mounted) return;
          const updates: Partial<Participant> = {};
          if (typeof muted === "boolean") updates.isMuted = muted;
          if (typeof deafened === "boolean") updates.isDeafened = deafened;
          if (typeof raised === "boolean") updates.handRaised = raised;
          updateParticipant(userId, updates);
        };
        socket.on("voice:state-updated", onVoiceStateUpdated);

        // Socket: Screen share state change
        const onScreenShareChanged = ({ userId: sharerId, isSharing }: { userId: string; isSharing: boolean }) => {
          if (!mounted) return;
          updateParticipant(sharerId, { isScreenSharing: isSharing });
          if (!isSharing) {
            setRemoteScreenStream((prev) => (prev?.userId === sharerId ? null : prev));
          }
        };
        socket.on("room:screen-share-changed", onScreenShareChanged);

        // Measure network mesh latency periodically
        const latencyTimer = setInterval(async () => {
          if (!mounted) return;
          const latency = await socketService.measureLatency();
          setNetworkLatency(latency);
        }, 5000);

        return () => {
          clearInterval(latencyTimer);
          socket.off("connect", onConnect);
          socket.off("disconnect", onDisconnect);
          socket.off("room:existing-peers", onExistingPeers);
          socket.off("room:user-joined", onUserJoined);
          socket.off("room:screen-share-changed", onScreenShareChanged);
          socket.off("voice:speaking-changed", onSpeakingChanged);
          socket.off("voice:state-updated", onVoiceStateUpdated);
        };
      } catch (err) {
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
      cleanupPromise.then((cleanupFn) => cleanupFn && cleanupFn());
      webrtcMeshManager.destroy();
      setStream(null);
      setLocalStream(null);
      setRemotePeers([]);
      setConnectionStatus("idle");
    };
  }, [roomId, user?.id]);

  // 2. React to isMuted changes
  useEffect(() => {
    webrtcMeshManager.setMuted(isMuted);
    if (roomId && user?.id) {
      socketService.sendVoiceState(roomId, { isMuted });
      updateParticipant(user.id, { isMuted });
    }
  }, [isMuted, roomId, user?.id]);

  // 3. React to isDeafened changes
  useEffect(() => {
    webrtcMeshManager.setDeafened(isDeafened);
    if (roomId && user?.id) {
      socketService.sendVoiceState(roomId, { isDeafened });
      updateParticipant(user.id, { isDeafened });
    }
  }, [isDeafened, roomId, user?.id]);

  // 4. React to handRaised changes
  useEffect(() => {
    if (roomId && user?.id) {
      socketService.sendVoiceState(roomId, { handRaised });
      updateParticipant(user.id, { handRaised });
    }
  }, [handRaised, roomId, user?.id]);

  // 5. Real-time microphone audio level analyzer and speaking detector
  useEffect(() => {
    if (!localStream || isMuted || isDeafened || !user?.id || !roomId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      if (lastSpeakingStateRef.current && user?.id && roomId) {
        lastSpeakingStateRef.current = false;
        setSpeaking(user.id, false);
        setAudioLevel(user.id, 0);
        updateParticipant(user.id, { isSpeaking: false, audioLevel: 0 });
        socketService.sendSpeaking(roomId, false, 0, user.id);
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
          socketService.sendSpeaking(roomId, speakingNow, normalizedVolume, user.id);
          updateParticipant(user.id, { isSpeaking: speakingNow, audioLevel: normalizedVolume });
        }
      }, 60);
    } catch (e) {
      // AudioContext fallback
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [localStream, isMuted, isDeafened, user?.id, roomId, setSpeaking, setAudioLevel, updateParticipant]);

  const handleShareScreen = useCallback(
    async (stream: MediaStream | null) => {
      await webrtcMeshManager.shareScreen(stream);
    },
    [roomId]
  );

  const handleSwitchAudioInput = useCallback(async (deviceId: string) => {
    await webrtcMeshManager.switchAudioInput(deviceId);
  }, []);

  return {
    localStream,
    remotePeers,
    remoteScreenStream,
    isSocketConnected,
    connectionStatus,
    mediaError,
    audioPlaybackBlocked,
    resumeRemoteAudio: () => webrtcMeshManager.resumeRemoteAudio(),
    shareScreen: handleShareScreen,
    switchAudioInput: handleSwitchAudioInput,
  };
}
