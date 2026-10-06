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
        setStream(stream);
        setLocalStream(stream);
        setConnectionStatus("connected");

        const socket = socketService.getSocket();
        setIsSocketConnected(socket.connected);

        const onConnect = () => setIsSocketConnected(true);
        const onDisconnect = () => setIsSocketConnected(false);
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

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

        // Socket: Existing peers in room with full voiceState (received by joiner)
        socket.on("room:existing-peers", ({ peers }: { peers: Array<{ socketId: string; userId: string; user: any; voiceState?: any }> }) => {
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
        });

        // Socket: User joined room (received by existing peers)
        socket.on("room:user-joined", ({ userId, user: newPeerUser }: { userId: string; user: any }) => {
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
        });

        // Ensure local user is represented in participants list
        if (user) {
          addParticipant({
            ...user,
            isHost: false,
            isSpeaking: false,
            isMuted,
            isDeafened,
            handRaised,
          });
        }

        // Socket: Dynamic Speaking Amplitude Broadcast
        socket.on("voice:speaking-changed", ({ userId, isSpeaking: speaking, level }: { userId: string; isSpeaking: boolean; level: number }) => {
          if (!mounted) return;
          setSpeaking(userId, speaking);
          setAudioLevel(userId, level);
          updateParticipant(userId, { isSpeaking: speaking, audioLevel: level });
        });

        // Socket: Tactical Voice State Updates (Mute, Deafen, Hand)
        socket.on("voice:state-updated", ({ userId, isMuted: muted, isDeafened: deafened, handRaised: raised }: { userId: string; isMuted?: boolean; isDeafened?: boolean; handRaised?: boolean }) => {
          if (!mounted) return;
          const updates: Partial<Participant> = {};
          if (typeof muted === "boolean") updates.isMuted = muted;
          if (typeof deafened === "boolean") updates.isDeafened = deafened;
          if (typeof raised === "boolean") updates.handRaised = raised;
          updateParticipant(userId, updates);
        });

        // Socket: User left room
        socket.on("room:user-left", ({ socketId, userId: leftUserId }: { socketId: string; userId: string }) => {
          if (!mounted) return;
          console.log(`[useWebRTC] User left room: ${leftUserId} (${socketId})`);
          webrtcMeshManager.closePeer(socketId, leftUserId);
          setRemotePeers((prev) => prev.filter((p) => p.socketId !== socketId));
          setRemoteScreenStream((prev) => (prev?.userId === leftUserId ? null : prev));
          removeParticipant(leftUserId);
        });

        // Socket: Screen share state change
        socket.on("room:screen-share-changed", ({ userId: sharerId, isSharing }: { userId: string; isSharing: boolean }) => {
          if (!mounted) return;
          updateParticipant(sharerId, { isScreenSharing: isSharing });
          if (!isSharing) {
            setRemoteScreenStream((prev) => (prev?.userId === sharerId ? null : prev));
          }
        });

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
          socket.off("room:existing-peers");
          socket.off("room:user-joined");
          socket.off("room:user-left");
          socket.off("room:screen-share-changed");
          socket.off("voice:speaking-changed");
          socket.off("voice:state-updated");
        };
      } catch (err) {
        console.error("[useWebRTC] Failed to initialize WebRTC mesh:", err);
        if (mounted) setConnectionStatus("idle");
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
        socketService.sendSpeaking(roomId, false, 0);
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
          socketService.sendSpeaking(roomId, speakingNow, normalizedVolume);
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
      if (roomId) {
        const socket = socketService.getSocket();
        socket.emit("room:screen-share", { roomId, isSharing: Boolean(stream) });
      }
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
    shareScreen: handleShareScreen,
    switchAudioInput: handleSwitchAudioInput,
  };
}
