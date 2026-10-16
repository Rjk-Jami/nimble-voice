"use client";

import { socketService } from "./socket";
import { User } from "@/types";

export const DEFAULT_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
  iceCandidatePoolSize: 4,
};

export interface RemotePeerMedia {
  socketId: string;
  userId: string;
  stream: MediaStream;
  connectionState: RTCPeerConnectionState;
}

export class WebRTCMeshManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private peerStreams: Map<string, MediaStream> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private queuedCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private socketUserMap: Map<string, string> = new Map();
  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private roomId: string | null = null;
  private currentUser: Partial<User> | null = null;

  private screenStream: MediaStream | null = null;

  // Perfect Negotiation State Tracking
  private makingOffer: Map<string, boolean> = new Map();
  private pendingRenegotiation: Map<string, boolean> = new Map();
  private lastIceRestartTime: Map<string, number> = new Map();

  // Callbacks
  public onRemoteStream?: (peer: RemotePeerMedia) => void;
  public onRemoteScreenStream?: (data: { socketId: string; userId: string; stream: MediaStream | null }) => void;
  public onPeerDisconnected?: (socketId: string, userId: string) => void;
  public onConnectionStateChange?: (socketId: string, state: RTCPeerConnectionState) => void;
  public onPeerSpeaking?: (socketId: string, userId: string, isSpeaking: boolean, level: number) => void;

  // Real-time remote peer voice recognition analysers
  private peerAnalysers: Map<
    string,
    { ctx: AudioContext; analyser: AnalyserNode; source: MediaStreamAudioSourceNode; timer: any }
  > = new Map();

  constructor() {}

  /**
   * Determine W3C Perfect Negotiation politeness deterministically
   */
  private isPolite(peerUserId: string, peerSocketId: string): boolean {
    const myId = this.currentUser?.id || "";
    if (myId && peerUserId && myId !== peerUserId) {
      return myId.localeCompare(peerUserId) > 0;
    }
    const mySocketId = socketService.getSocketId() || "";
    return mySocketId.localeCompare(peerSocketId) > 0;
  }

  /**
   * Initialize local audio media stream from microphone
   */
  public async initLocalMedia(deviceId?: string): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;

      // Apply initial mute state
      this.setMuted(this.isMuted);

      return stream;
    } catch (err: any) {
      console.warn("[WebRTC] Could not acquire real microphone stream, using silent fallback:", err.message);
      // Fallback: create silent audio stream so WebRTC peer connection can still be negotiated
      const fallbackStream = this.createSilentAudioStream();
      this.localStream = fallbackStream;
      return fallbackStream;
    }
  }

  /**
   * Helper fallback to generate a silent audio track if user denies mic permissions
   */
  private createSilentAudioStream(): MediaStream {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination()) as MediaStreamAudioDestinationNode;
        oscillator.start();
        const track = dst.stream.getAudioTracks()[0];
        track.enabled = false;
        return dst.stream;
      }
    } catch {
      // Ignore
    }
    return new MediaStream();
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Switch audio input device dynamically in real-time
   */
  public async switchAudioInput(deviceId: string): Promise<void> {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      });

      const newAudioTrack = newStream.getAudioTracks()[0];
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((t) => t.stop());
        const oldTrack = this.localStream.getAudioTracks()[0];
        if (oldTrack) this.localStream.removeTrack(oldTrack);
        this.localStream.addTrack(newAudioTrack);
      } else {
        this.localStream = newStream;
      }

      newAudioTrack.enabled = !this.isMuted;

      // Replace audio track on all peers
      for (const pc of this.peers.values()) {
        const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === "audio");
        if (audioSender) {
          await audioSender.replaceTrack(newAudioTrack);
        }
      }
    } catch (err) {
      console.warn("[WebRTC] Could not switch audio input device:", err);
    }
  }

  /**
   * Add or remove screen sharing video track across all peer connections
   */
  public async shareScreen(stream: MediaStream | null): Promise<void> {
    this.screenStream = stream;
    const videoTrack = stream ? stream.getVideoTracks()[0] : null;

    for (const [socketId, pc] of this.peers.entries()) {
      try {
        const transceivers = pc.getTransceivers();
        const videoTransceiver = transceivers.find(
          (t) => t.receiver.track.kind === "video" || t.sender.track?.kind === "video"
        );

        if (videoTransceiver) {
          if (videoTrack && stream) {
            await videoTransceiver.sender.replaceTrack(videoTrack);
            videoTransceiver.direction = "sendrecv";
            await this.createOfferToPeer(socketId, "");
          } else {
            await videoTransceiver.sender.replaceTrack(null);
            videoTransceiver.direction = "recvonly";
            await this.createOfferToPeer(socketId, "");
          }
        } else if (videoTrack && stream) {
          pc.addTrack(videoTrack, stream);
          await this.createOfferToPeer(socketId, "");
        }
      } catch (err) {
        console.warn(`[WebRTC] Failed to update screen share track for peer ${socketId}:`, err);
      }
    }

    if (this.roomId) {
      socketService.sendScreenShare(this.roomId, !!stream);
    }
  }

  /**
   * Toggle or set mute state for microphone track
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Toggle or set deafen state (muting all incoming remote peer audio)
   */
  public setDeafened(deafened: boolean): void {
    this.isDeafened = deafened;
    this.audioElements.forEach((audio) => {
      audio.muted = deafened;
    });
  }

  /**
   * Join a room and initialize WebRTC mesh
   */
  public async joinRoom(roomId: string, user: Partial<User>): Promise<void> {
    this.roomId = roomId;
    this.currentUser = user;

    // Acquire mic stream
    await this.initLocalMedia();

    // Register socket listeners for WebRTC signaling
    const socket = socketService.connect();
    this.setupSocketSignaling(socket);

    // Join room over socket
    socketService.joinRoom(roomId, user);
  }

  private setupSocketSignaling(socket: any): void {
    // 1. Existing peers in room: prepare connection and initiate offer to each
    socket.off("room:existing-peers");
    socket.on("room:existing-peers", async ({ peers }: { peers: Array<{ socketId: string; userId: string; user: any }> }) => {
      console.log(`[WebRTC] Received ${peers.length} existing peers:`, peers);
      for (const peer of peers) {
        this.getOrCreatePeerConnection(peer.socketId, peer.userId);
        await this.createOfferToPeer(peer.socketId, peer.userId);
      }
    });

    // 1b. New peer arrived in room: existing peer initiates offer to the newcomer
    socket.off("room:user-joined");
    socket.on("room:user-joined", async ({ socketId, userId, user }: { socketId: string; userId: string; user: any }) => {
      console.log(`[WebRTC] New peer joined room (${socketId}, ${userId}), initiating offer...`);
      await this.createOfferToPeer(socketId, userId);
    });

    // 2. Incoming SDP Offer
    socket.off("webrtc:offer");
    socket.on("webrtc:offer", async (data: any) => {
      const senderSocketId = data.senderSocketId;
      const userId = data.userId || data.senderId || "";
      const sdp = data.sdp;
      console.log(`[WebRTC] Received offer from ${senderSocketId} (${userId})`);
      await this.handleOffer(senderSocketId, userId, sdp);
    });

    // 3. Incoming SDP Answer
    socket.off("webrtc:answer");
    socket.on("webrtc:answer", async (data: any) => {
      const senderSocketId = data.senderSocketId;
      const sdp = data.sdp;
      console.log(`[WebRTC] Received answer from ${senderSocketId}`);
      await this.handleAnswer(senderSocketId, sdp);
    });

    // 4. Incoming ICE Candidate
    socket.off("webrtc:ice-candidate");
    socket.on("webrtc:ice-candidate", async (data: any) => {
      const senderSocketId = data.senderSocketId;
      const candidate = data.candidate;
      await this.handleIceCandidate(senderSocketId, candidate);
    });

    // 5. Peer Left
    socket.off("room:user-left");
    socket.on("room:user-left", ({ socketId, userId }: { socketId: string; userId: string }) => {
      console.log(`[WebRTC] Peer ${socketId} left room`);
      this.closePeer(socketId, userId);
    });
  }

  /**
   * Handle automatic ICE restart when connection drops or fails
   */
  private async handleIceFailure(targetSocketId: string, userId: string): Promise<void> {
    const now = Date.now();
    const lastRestart = this.lastIceRestartTime.get(targetSocketId) || 0;
    if (now - lastRestart < 6000) {
      return; // Debounce restarts to at most once per 6 seconds
    }
    this.lastIceRestartTime.set(targetSocketId, now);

    const pc = this.peers.get(targetSocketId);
    if (!pc || pc.signalingState === "closed") return;

    console.log(`[WebRTC] Peer ${targetSocketId} connection failed. Triggering automatic ICE restart...`);
    try {
      if (typeof pc.restartIce === "function") {
        pc.restartIce();
      }
      await this.createOfferToPeer(targetSocketId, userId, true);
    } catch (err) {
      console.warn(`[WebRTC] ICE restart failed for ${targetSocketId}:`, err);
    }
  }

  /**
   * Create RTCPeerConnection for a target peer
   */
  private getOrCreatePeerConnection(targetSocketId: string, userId: string): RTCPeerConnection {
    if (userId) {
      this.socketUserMap.set(targetSocketId, userId);
    }

    let pc = this.peers.get(targetSocketId);
    if (pc && pc.signalingState !== "closed") {
      return pc;
    }

    if (pc) {
      try {
        pc.close();
      } catch {}
      this.peers.delete(targetSocketId);
    }

    pc = new RTCPeerConnection(DEFAULT_ICE_SERVERS);
    this.peers.set(targetSocketId, pc);

    // 1. Audio track / transceiver (m-line 0: audio)
    if (this.localStream && this.localStream.getAudioTracks().length > 0) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc?.addTrack(track, this.localStream!);
      });
    } else {
      pc.addTransceiver("audio", { direction: "sendrecv" });
    }

    // 2. Video track / transceiver (m-line 1: video)
    // Fixing transceivers upfront ensures m-line order remains stable and never conflicts
    if (this.screenStream && this.screenStream.getVideoTracks().length > 0) {
      this.screenStream.getVideoTracks().forEach((track) => {
        pc?.addTrack(track, this.screenStream!);
      });
    } else {
      pc.addTransceiver("video", { direction: "recvonly" });
    }

    // Trickle ICE Candidate Handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendIceCandidate({
          targetSocketId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection State Change
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${targetSocketId} connection state: ${pc?.connectionState}`);
      this.onConnectionStateChange?.(targetSocketId, pc!.connectionState);
      if (pc?.connectionState === "failed") {
        const effectiveUserId = userId || this.socketUserMap.get(targetSocketId) || "";
        this.handleIceFailure(targetSocketId, effectiveUserId);
      }
    };

    // ICE Connection State Change
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${targetSocketId} ICE state: ${pc?.iceConnectionState}`);
      if (pc?.iceConnectionState === "failed") {
        const effectiveUserId = userId || this.socketUserMap.get(targetSocketId) || "";
        this.handleIceFailure(targetSocketId, effectiveUserId);
      }
    };

    // Incoming Remote Stream Track
    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        stream = new MediaStream([event.track]);
      }

      const effectiveUserId = userId || this.socketUserMap.get(targetSocketId) || "";

      if (event.track.kind === "video") {
        console.log(`[WebRTC] Received remote screen share track from ${targetSocketId} (User: ${effectiveUserId})`);
        const videoStream = new MediaStream([event.track]);
        this.onRemoteScreenStream?.({
          socketId: targetSocketId,
          userId: effectiveUserId,
          stream: videoStream,
        });

        event.track.onended = () => {
          this.onRemoteScreenStream?.({
            socketId: targetSocketId,
            userId: effectiveUserId,
            stream: null,
          });
        };
        return;
      }

      console.log(`[WebRTC] Received remote audio track from ${targetSocketId} (User: ${effectiveUserId})`);
      this.peerStreams.set(targetSocketId, stream);

      // Play audio in dedicated element
      let audioEl = this.audioElements.get(targetSocketId);
      if (!audioEl) {
        audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        audioEl.muted = this.isDeafened;
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);
        this.audioElements.set(targetSocketId, audioEl);
      }

      audioEl.srcObject = stream;
      audioEl.play().catch((err) => {
        console.warn(`[WebRTC] Auto-play was prevented for peer ${targetSocketId}:`, err);
      });

      this.onRemoteStream?.({
        socketId: targetSocketId,
        userId: effectiveUserId,
        stream,
        connectionState: pc!.connectionState,
      });

      // Analyze remote audio in real-time to detect when this peer is speaking
      this.setupRemoteAudioAnalysis(targetSocketId, effectiveUserId, stream);
    };

    return pc;
  }

  /**
   * Initiate WebRTC SDP offer to target peer using Perfect Negotiation
   */
  public async createOfferToPeer(targetSocketId: string, userId: string, isRestartIce = false): Promise<void> {
    try {
      const pc = this.getOrCreatePeerConnection(targetSocketId, userId);

      // Re-entrancy guard: defer if already making an offer
      if (this.makingOffer.get(targetSocketId)) {
        console.warn(`[WebRTC] Already making offer to ${targetSocketId}, queueing pending renegotiation`);
        this.pendingRenegotiation.set(targetSocketId, true);
        return;
      }

      // WebRTC: Only create offer if in stable state
      if (pc.signalingState !== "stable") {
        console.warn(
          `[WebRTC] Deferring offer to ${targetSocketId}: connection state is '${pc.signalingState}', not 'stable'`
        );
        this.pendingRenegotiation.set(targetSocketId, true);
        return;
      }

      this.makingOffer.set(targetSocketId, true);

      const offer = await pc.createOffer(isRestartIce ? { iceRestart: true } : undefined);

      if (pc.signalingState !== "stable") {
        console.warn(`[WebRTC] Aborting setLocalDescription(offer) to ${targetSocketId}: state transitioned to '${pc.signalingState}'`);
        return;
      }

      await pc.setLocalDescription(offer);

      socketService.sendOffer({
        targetSocketId,
        sdp: pc.localDescription || offer,
        user: this.currentUser as any,
      });
    } catch (err) {
      console.error(`[WebRTC] Failed to create offer to ${targetSocketId}:`, err);
    } finally {
      this.makingOffer.set(targetSocketId, false);
    }
  }

  /**
   * Handle incoming WebRTC SDP offer with W3C Perfect Negotiation glare handling
   */
  public async handleOffer(senderSocketId: string, userId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    try {
      const pc = this.getOrCreatePeerConnection(senderSocketId, userId);
      const isPolite = this.isPolite(userId, senderSocketId);
      const isMakingOffer = !!this.makingOffer.get(senderSocketId);

      // Glare / collision check
      const offerCollision = sdp.type === "offer" && (isMakingOffer || pc.signalingState !== "stable");
      const shouldIgnore = !isPolite && offerCollision;

      if (shouldIgnore) {
        console.log(`[WebRTC] Glare detected with ${senderSocketId}. Impolite peer ignoring colliding offer.`);
        return;
      }

      if (offerCollision) {
        console.log(`[WebRTC] Glare detected with ${senderSocketId}. Polite peer rolling back local description.`);
        try {
          if (pc.signalingState !== "stable") {
            await pc.setLocalDescription({ type: "rollback" });
          }
        } catch (rollbackErr) {
          console.warn("[WebRTC] Rollback error:", rollbackErr);
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush any queued ICE candidates for this peer
      await this.flushQueuedCandidates(senderSocketId, pc);

      if (pc.signalingState === "have-remote-offer") {
        const answer = await pc.createAnswer();
        if (pc.signalingState !== "have-remote-offer") {
          console.warn(`[WebRTC] Skipping setLocalDescription(answer): state transitioned to '${pc.signalingState}'`);
          return;
        }
        await pc.setLocalDescription(answer);

        socketService.sendAnswer({
          targetSocketId: senderSocketId,
          sdp: answer,
        });
      } else {
        console.warn(`[WebRTC] Skipping answer creation: signalingState is '${pc.signalingState}', expected 'have-remote-offer'`);
      }
    } catch (err) {
      console.error(`[WebRTC] Failed to handle offer from ${senderSocketId}:`, err);
    }
  }

  /**
   * Handle incoming WebRTC SDP answer
   */
  public async handleAnswer(senderSocketId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    try {
      const pc = this.peers.get(senderSocketId);
      if (!pc) return;

      // WebRTC Spec: An answer can ONLY be set when connection is in "have-local-offer" state.
      if (pc.signalingState !== "have-local-offer") {
        console.warn(
          `[WebRTC] Ignoring SDP answer from ${senderSocketId}: connection state is '${pc.signalingState}', not 'have-local-offer'`
        );
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.flushQueuedCandidates(senderSocketId, pc);

      // If pending renegotiation was queued while in non-stable state, trigger now
      if (this.pendingRenegotiation.get(senderSocketId)) {
        this.pendingRenegotiation.delete(senderSocketId);
        await this.createOfferToPeer(senderSocketId, "");
      }
    } catch (err) {
      console.error(`[WebRTC] Failed to handle answer from ${senderSocketId}:`, err);
    }
  }

  /**
   * Handle incoming trickle ICE candidate with resilient queueing
   */
  public async handleIceCandidate(senderSocketId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(senderSocketId);
    if (!pc || !pc.remoteDescription || pc.signalingState === "closed") {
      // Queue candidate until remote description is set
      const queue = this.queuedCandidates.get(senderSocketId) || [];
      queue.push(candidate);
      this.queuedCandidates.set(senderSocketId, queue);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err: any) {
      if (!err?.message?.includes("closed")) {
        console.warn(`[WebRTC] Could not add ICE candidate from ${senderSocketId}:`, err?.message);
      }
    }
  }

  private async flushQueuedCandidates(senderSocketId: string, pc: RTCPeerConnection): Promise<void> {
    const queued = this.queuedCandidates.get(senderSocketId);
    if (!queued || queued.length === 0) return;
    this.queuedCandidates.delete(senderSocketId);

    for (const cand of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn(`[WebRTC] Could not add flushed ICE candidate:`, err);
      }
    }
  }

  /**
   * Set up real-time audio analysis on remote peer stream to recognize speaking activity
   */
  private setupRemoteAudioAnalysis(socketId: string, userId: string, stream: MediaStream): void {
    try {
      this.cleanupRemoteAudioAnalysis(socketId);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.45;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSpeaking = false;

      const timer = setInterval(() => {
        if (ctx.state === "closed") return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalizedVolume = Math.min(100, Math.round((avg / 128) * 100));
        const speakingNow = normalizedVolume > 12;

        if (speakingNow !== lastSpeaking) {
          lastSpeaking = speakingNow;
          const effectiveUserId = userId || this.socketUserMap.get(socketId) || "";
          this.onPeerSpeaking?.(socketId, effectiveUserId, speakingNow, normalizedVolume);
        }
      }, 60);

      this.peerAnalysers.set(socketId, { ctx, analyser, source, timer });
    } catch {
      // AudioContext fallback
    }
  }

  private cleanupRemoteAudioAnalysis(socketId: string): void {
    const existing = this.peerAnalysers.get(socketId);
    if (existing) {
      clearInterval(existing.timer);
      try {
        existing.source.disconnect();
        existing.analyser.disconnect();
        if (existing.ctx.state !== "closed") {
          existing.ctx.close().catch(() => {});
        }
      } catch {}
      this.peerAnalysers.delete(socketId);
    }
  }

  /**
   * Close connection with a specific peer
   */
  public closePeer(socketId: string, userId?: string): void {
    this.cleanupRemoteAudioAnalysis(socketId);

    const pc = this.peers.get(socketId);
    if (pc) {
      pc.close();
      this.peers.delete(socketId);
    }

    const audioEl = this.audioElements.get(socketId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      if (audioEl.parentNode) {
        audioEl.parentNode.removeChild(audioEl);
      }
      this.audioElements.delete(socketId);
    }

    this.peerStreams.delete(socketId);
    this.queuedCandidates.delete(socketId);
    this.socketUserMap.delete(socketId);
    this.makingOffer.delete(socketId);
    this.pendingRenegotiation.delete(socketId);
    this.lastIceRestartTime.delete(socketId);

    if (userId) {
      this.onPeerDisconnected?.(socketId, userId);
    }
  }

  /**
   * Cleanly leave room, close all peer connections, stop mic tracks, and disconnect socket
   */
  public destroy(): void {
    // 0. Unbind WebRTC signaling socket listeners
    const socket = socketService.getSocket();
    if (socket) {
      socket.off("room:existing-peers");
      socket.off("room:user-joined");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
      socket.off("room:user-left");
    }

    // Clean up remote peer audio analysers
    this.peerAnalysers.forEach((_, socketId) => this.cleanupRemoteAudioAnalysis(socketId));
    this.peerAnalysers.clear();
    this.socketUserMap.clear();

    // 1. Close all peer connections
    this.peers.forEach((pc) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    });
    this.peers.clear();

    // 2. Stop and detach audio elements
    this.audioElements.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    });
    this.audioElements.clear();

    // 3. Stop local and remote tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    this.peerStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    this.peerStreams.clear();
    this.queuedCandidates.clear();
    this.makingOffer.clear();
    this.pendingRenegotiation.clear();
    this.lastIceRestartTime.clear();

    // 4. Clear callbacks
    this.onRemoteStream = undefined;
    this.onRemoteScreenStream = undefined;
    this.onPeerDisconnected = undefined;
    this.onConnectionStateChange = undefined;
    this.onPeerSpeaking = undefined;

    // 5. Notify socket server
    if (this.roomId) {
      socketService.leaveRoom(this.roomId);
    } else {
      socketService.leaveRoom();
    }
    this.roomId = null;
  }
}

export const webrtcMeshManager = new WebRTCMeshManager();
