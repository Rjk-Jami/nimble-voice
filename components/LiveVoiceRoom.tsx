"use client";

import React, { useState, useRef, useEffect } from "react";
import { useVoiceRoom, useMessenger, useSpeakingDetection } from "@/hooks";
import { useAuthStore, useUIStore } from "@/stores";
import { VoiceRoom } from "@/types";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Share2,
  Hand,
  PhoneOff,
  Send,
  Headphones,
  Sparkles,
  MessageSquare,
  Smile,
  Copy,
  Check,
  Paperclip,
  X,
  Loader2,
  Lock,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingReactionItem, FloatingReactions } from "./motion/FloatingReaction";
import { MotionButton } from "./motion/MotionButton";
import { TacticalEqualizer } from "./motion/TacticalEqualizer";
import { SpeakingRipple } from "./motion/SpeakingRipple";
import { ImageLightbox } from "./ImageLightbox";
import { socketService } from "@/lib/socket";

interface LiveVoiceRoomProps {
  room: VoiceRoom;
}

const AVAILABLE_REACTIONS = ["👍", "❤️", "😂", "👏", "🔥", "💡", "🎉"] as const;

function getReactionCounts(reactions?: Record<string, string[]> | string[]): {
  emoji: string;
  count: number;
  users: string[];
}[] {
  if (!reactions) return [];
  if (Array.isArray(reactions)) {
    const counts: Record<string, number> = {};
    reactions.forEach((e) => {
      counts[e] = (counts[e] || 0) + 1;
    });
    return Object.entries(counts).map(([emoji, count]) => ({
      emoji,
      count,
      users: [],
    }));
  }
  return Object.entries(reactions)
    .filter(([_, users]) => Array.isArray(users) && users.length > 0)
    .map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users,
    }));
}

export function LiveVoiceRoom({ room }: LiveVoiceRoomProps) {
  const {
    room: currentRoom,
    isMuted,
    isDeafened,
    isScreenSharing,
    handRaised,
    networkLatency,
    formattedDuration,
    localStream,
    remoteScreenStream,
    isSocketConnected,
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
    toggleHandRaised,
    shareScreen,
    leaveRoom,
  } = useVoiceRoom(room);

  const { messages, sendMessage, uploadAttachment, sendReaction, reactToMessage } = useMessenger(
    currentRoom?.id || room.id,
    currentRoom?.messages || room.messages
  );

  const user = useAuthStore((s) => s.user);
  const openLeaveConfirm = useUIStore((s) => s.openLeaveConfirm);

  // Guardrail: Intercept accidental tab close or page reload during active call
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Messenger local input & media state
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeMessagePicker, setActiveMessagePicker] = useState<string | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Floating live emoji reactions
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);

  // Screen share streams
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const isHost = Boolean(user?.id && (currentRoom?.host?.id === user.id || room.host?.id === user.id));
  const [isLocked, setIsLocked] = useState(Boolean(currentRoom?.hasFreeSeats === false));

  // Hook into real WebRTC microphone stream for speaking detection
  const { isSpeaking } = useSpeakingDetection(localStream);

  // Sync real-time host moderation events
  useEffect(() => {
    const socket = socketService.getSocket();
    const roomId = currentRoom?.id || room.id;

    const handleForceMuted = (data: any) => {
      if (data?.roomId === roomId) {
        if (!isMuted) toggleMute();
        alert(data?.reason || "You were muted by the room host.");
      }
    };

    const handleKicked = (data: any) => {
      if (data?.roomId === roomId) {
        alert(data?.reason || "You were removed from this room by the host.");
        leaveRoom();
      }
    };

    const handleLockChanged = (data: any) => {
      if (data?.roomId === roomId) {
        setIsLocked(Boolean(data.isLocked));
      }
    };

    socket.on("room:force-muted", handleForceMuted);
    socket.on("room:kicked", handleKicked);
    socket.on("room:lock-changed", handleLockChanged);

    return () => {
      socket.off("room:force-muted", handleForceMuted);
      socket.off("room:kicked", handleKicked);
      socket.off("room:lock-changed", handleLockChanged);
    };
  }, [currentRoom?.id, room.id, isMuted, toggleMute, leaveRoom]);

  // Sync real-time floating reactions from peers
  useEffect(() => {
    const socket = socketService.getSocket();

    const handleReaction = (reaction: { id: string; emoji: string; xOffset?: number }) => {
      const newReaction: FloatingReactionItem = {
        id: reaction.id || `${Date.now()}-${Math.random()}`,
        emoji: reaction.emoji,
        xOffset: reaction.xOffset || (Math.random() - 0.5) * 160,
      };
      setFloatingReactions((prev) => [...prev.slice(-8), newReaction]);
    };

    socket.on("reaction:new-reaction", handleReaction);
    return () => {
      socket.off("reaction:new-reaction", handleReaction);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect local screen share video element
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Connect remote peer screen share video element
  useEffect(() => {
    if (remoteScreenVideoRef.current && remoteScreenStream?.stream) {
      remoteScreenVideoRef.current.srcObject = remoteScreenStream.stream;
    }
  }, [remoteScreenStream]);

  // Handle dynamic screen share
  const handleToggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      await shareScreen(null);
      toggleScreenShare();
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        setScreenStream(stream);
        await shareScreen(stream);
        toggleScreenShare();

        stream.getVideoTracks()[0].onended = async () => {
          setScreenStream(null);
          await shareScreen(null);
          toggleScreenShare();
        };
      } catch {
        // User cancelled picker
      }
    }
  };

  const handleCopyInvite = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (PNG, JPEG, WebP, GIF)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit");
      return;
    }
    setPendingFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPendingFilePreview(objectUrl);
  };

  const handleClearPendingFile = () => {
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview);
    }
    setPendingFile(null);
    setPendingFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !pendingFile) return;

    if (pendingFile) {
      setIsUploading(true);
      try {
        const uploaded = await uploadAttachment(pendingFile);
        if (uploaded?.url) {
          await sendMessage(inputText, {
            url: uploaded.url,
            type: uploaded.contentType || pendingFile.type || "image/png",
          });
          setInputText("");
          handleClearPendingFile();
        }
      } catch (err) {
        console.error("Failed to send message with attachment:", err);
      } finally {
        setIsUploading(false);
      }
    } else {
      sendMessage(inputText);
      setInputText("");
    }
  };

  const handleTriggerReaction = (emoji: string) => {
    sendReaction(emoji);
    const newReaction: FloatingReactionItem = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      xOffset: (Math.random() - 0.5) * 160,
    };
    setFloatingReactions((prev) => [...prev.slice(-8), newReaction]);
  };

  const participantsList = currentRoom?.participants || room.participants;
  const maxSlots = currentRoom?.maxSlots || room.maxSlots;

  return (
    <div className="w-full px-2.5 sm:px-4 md:px-6 py-2.5 sm:py-3.5 max-w-[1720px] mx-auto flex flex-col gap-3.5 animate-fade-in relative">
      {/* Floating Reactions Overlay */}
      <FloatingReactions reactions={floatingReactions} />

      {/* ================= 1. COMPACT TOP ROOM CONTROL BAR ================= */}
      <header className="w-full bg-[#161c23]/95 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 border border-[#2a3340]/80 shadow-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 relative z-20">
        {/* Room Context & Identity with Hover Tooltip */}
        <div className="group relative flex items-center gap-2.5 min-w-0 cursor-pointer">
          <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-[#242a32] text-[#22c55e] border border-[#2a3340] shrink-0 shadow-inner">
            <span className="text-base sm:text-lg">{currentRoom?.flag || room.flag || "🎙️"}</span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-bold text-xs sm:text-sm md:text-base text-[#dde3ed] truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {currentRoom?.title || room.title}
              </h1>
              <span className="hidden xs:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#242a32] text-[#22c55e] border border-[#2a3340] text-[10px] sm:text-xs font-semibold">
                <span>{currentRoom?.language || room.language}</span> •{" "}
                <span>{currentRoom?.levelLabel || room.levelLabel}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#94a3b8] text-[10px] sm:text-xs mt-0.5">
              <span className="inline-flex items-center gap-1 font-semibold text-[#dde3ed]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] -ml-2.5" />
                <span>Live: {formattedDuration}</span>
              </span>
              <span>•</span>
              <span className="text-[#94a3b8]">
                {participantsList.length}/{maxSlots} seats
              </span>
            </div>
          </div>

          {/* Interactive Room Details Tooltip on Hover */}
          <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 p-3 bg-[#12171e]/98 backdrop-blur-xl border border-[#2a3340] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
            <div className="flex items-start gap-2.5 pb-2 border-b border-[#2a3340]/60">
              <div className="w-9 h-9 rounded-lg bg-[#242a32] text-[#22c55e] border border-[#2a3340] flex items-center justify-center font-bold text-lg shrink-0">
                {currentRoom?.flag || room.flag || "🎙️"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[#dde3ed] leading-snug line-clamp-2">
                  {currentRoom?.title || room.title}
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-0.5">
                  {currentRoom?.language || room.language} • {currentRoom?.levelLabel || room.levelLabel}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
              <div className="flex flex-col">
                <span className="text-[#94a3b8]">Active Room Duration</span>
                <span className="font-semibold text-[#22c55e] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  {formattedDuration}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#94a3b8]">Live Occupancy</span>
                <span className="font-semibold text-[#dde3ed]">
                  {participantsList.length} of {maxSlots} Seats Filled
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#94a3b8]">Mesh Latency</span>
                <span className="font-semibold text-[#22c55e]">{networkLatency} ms</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#94a3b8]">Host Peer</span>
                <span className="font-semibold text-[#dde3ed] truncate">
                  {currentRoom?.host?.name || room.host.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Central Audio & Tactical Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 ml-auto">
          {/* Mic Toggle */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs transition-colors shadow-md cursor-pointer ${
              !isMuted
                ? "bg-[#22c55e] text-[#003915] hover:bg-[#4be277] shadow-[0_0_12px_rgba(34,197,94,0.35)]"
                : "bg-[#242a32] text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#2f353d]"
            }`}
          >
            {!isMuted ? (
              <>
                <TacticalEqualizer isActive={true} barCount={3} size="sm" color="#003915" />
                <Mic className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Transmitting</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Muted</span>
              </>
            )}
          </motion.button>

          {/* Deafen Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDeafen}
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-colors cursor-pointer ${
              isDeafened
                ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
            }`}
            title={isDeafened ? "Sound Muted (Deafened)" : "Sound Active"}
          >
            {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </motion.button>

          {/* Screen Share Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleScreenShare}
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-colors cursor-pointer ${
              screenStream || isScreenSharing
                ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
            }`}
            title="Share screen / window"
          >
            <Share2 className="w-4 h-4" />
          </motion.button>

          {/* Raise Hand Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleHandRaised}
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-colors cursor-pointer ${
              handRaised
                ? "bg-[#eab308]/20 border-[#eab308] text-[#eab308]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
            }`}
            title="Raise Hand"
          >
            <Hand className="w-4 h-4" />
          </motion.button>

          {/* Leave Room Action */}
          <MotionButton
            variant="danger"
            size="sm"
            onClick={() => openLeaveConfirm()}
            className="px-2.5 sm:px-3 py-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </MotionButton>
        </div>
      </header>

      {/* ================= 2. MAIN ACTIVE WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 md:gap-5 items-start">
        {/* ================= PARTICIPANT STAGE (col-span-8) ================= */}
        <section className="lg:col-span-8 flex flex-col gap-3 min-w-0">
          {/* Live Screen Share Stream (WebRTC DisplayMedia: Local or Remote) */}
          {(screenStream || remoteScreenStream) && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full bg-[#0d1217] border border-[#22c55e]/50 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xl relative flex flex-col gap-2 overflow-hidden"
            >
              <div className="flex items-center justify-between px-2 pt-0.5 text-xs text-[#94a3b8]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
                  <span className="font-bold text-[#dde3ed] text-xs sm:text-sm">
                    {screenStream
                      ? "You are sharing your screen"
                      : "Shared Screen Stream (Remote Peer)"}
                  </span>
                </div>
                {screenStream && (
                  <button
                    onClick={handleToggleScreenShare}
                    className="px-2.5 py-1 rounded-lg bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] font-semibold transition-colors cursor-pointer text-xs"
                  >
                    Stop Sharing
                  </button>
                )}
              </div>
              <div className="relative rounded-lg sm:rounded-xl overflow-hidden bg-black aspect-video max-h-[460px] flex items-center justify-center border border-[#2a3340]">
                {screenStream ? (
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : remoteScreenStream ? (
                  <video
                    ref={remoteScreenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>
            </motion.div>
          )}

          {/* Host Moderation Controls Bar */}
          {isHost && (
            <div className="w-full bg-[#161c23] border border-[#22c55e]/30 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
                <span className="text-xs font-bold text-[#dde3ed]">Host Controls</span>
                <span className="text-[11px] text-[#94a3b8] hidden sm:inline">• Manage conversation flow and participant access</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextLocked = !isLocked;
                    setIsLocked(nextLocked);
                    socketService.lockRoom(currentRoom?.id || room.id, nextLocked);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    isLocked
                      ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]"
                      : "bg-[#242a32] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isLocked ? "Room Locked" : "Lock Room"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Compact Participants Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 w-full">
            {participantsList.map((p) => {
              const isCurrentUser = p.id === user?.id;
              const speakerActive =
                (p.isSpeaking || (isCurrentUser && !isMuted && isSpeaking)) && !p.isMuted;

              return (
                <motion.div
                  key={p.id}
                  layout="position"
                  className={`relative rounded-xl sm:rounded-2xl p-3 sm:p-3.5 shadow-lg flex flex-col justify-between min-h-[145px] sm:min-h-[155px] transition-colors border ${
                    speakerActive
                      ? "bg-[#1a2027] border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.18)]"
                      : "bg-[#161c23] border-[#2a3340]/80"
                  }`}
                >
                  {/* Speaking Radial Glow */}
                  {speakerActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/12 via-transparent to-transparent pointer-events-none rounded-xl sm:rounded-2xl"
                    />
                  )}

                  {/* Tile Top Header */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      {p.isHost && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#242a32] text-[#22c55e] font-bold text-[10px] border border-[#2a3340]">
                          <Sparkles className="w-2.5 h-2.5 text-[#22c55e]" />
                          HOST
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#22c55e]/20 text-[#22c55e] font-bold text-[10px] border border-[#22c55e]/30">
                          YOU
                        </span>
                      )}
                      {/* Host Moderation Quick Buttons */}
                      {isHost && !isCurrentUser && !p.isHost && (
                        <div className="flex items-center gap-1 ml-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              socketService.muteUser(currentRoom?.id || room.id, p.id);
                            }}
                            title="Mute Participant"
                            className="p-1 rounded bg-[#242a32] hover:bg-[#ef4444]/20 text-[#94a3b8] hover:text-[#ef4444] transition-colors border border-[#2a3340]"
                          >
                            <MicOff className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Kick ${p.name} from the room?`)) {
                                socketService.kickUser(currentRoom?.id || room.id, p.id);
                              }
                            }}
                            title="Kick Participant"
                            className="p-1 rounded bg-[#242a32] hover:bg-[#ef4444]/20 text-[#94a3b8] hover:text-[#ef4444] transition-colors border border-[#2a3340]"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-[#090f15]/80 px-1.5 py-0.5 rounded-md border border-[#2a3340]">
                      {speakerActive ? (
                        <>
                          <TacticalEqualizer isActive={true} barCount={3} size="sm" />
                          <span className="text-[#22c55e] font-bold text-[9px] uppercase tracking-wide">
                            Live
                          </span>
                        </>
                      ) : p.isMuted ? (
                        <>
                          <MicOff className="w-2.5 h-2.5 text-[#ef4444]" />
                          <span className="text-[#ef4444] font-medium text-[9px] uppercase">
                            Muted
                          </span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-2.5 h-2.5 text-[#94a3b8]" />
                          <span className="text-[#94a3b8] font-medium text-[9px] uppercase">
                            Listening
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Compact Tile Center Avatar & Identity */}
                  <div className="relative z-10 flex items-center gap-3 my-2">
                    <div className="relative flex items-center justify-center shrink-0">
                      {speakerActive && <SpeakingRipple size={60} isActive={true} />}

                      <div
                        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 transition-all ${
                          speakerActive
                            ? "bg-gradient-to-tr from-[#22c55e] to-[#4be277] shadow-[0_0_14px_rgba(34,197,94,0.45)] scale-105"
                            : "bg-[#242a32]"
                        }`}
                      >
                        <img
                          src={
                            p.avatarUrl ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                          }
                          alt={p.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>

                      {/* Floating Mic status marker */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-md border border-[#161c23] ${
                          p.isMuted ? "bg-[#ef4444] text-white" : "bg-[#22c55e] text-[#003915]"
                        }`}
                      >
                        {p.isMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-[#dde3ed] truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] sm:text-xs text-[#94a3b8] truncate">
                        {p.location || "Global"} • {p.learningLanguage || room.language} (
                        {p.cefrPortfolio?.[room.language] || "Learner"})
                      </span>
                    </div>
                  </div>

                  {/* Tile Bottom Waveform / Status */}
                  <div className="relative z-10 w-full flex items-center justify-between pt-1.5 border-t border-[#2a3340]/60">
                    <span className="text-[10px] text-[#94a3b8] font-mono">
                      Native: {p.nativeLanguage || "English"}
                    </span>

                    {speakerActive ? (
                      <TacticalEqualizer isActive={true} barCount={4} size="sm" />
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
                        <Headphones className="w-3 h-3" />
                        <span>Connected</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Compact Empty Slots */}
            {Array.from({ length: Math.max(0, maxSlots - participantsList.length) }).map(
              (_, index) => (
                <div
                  key={`stage-empty-${index}`}
                  className="rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-dashed border-[#2a3340] bg-[#161c23]/35 flex items-center justify-between gap-3 min-h-[145px] sm:min-h-[155px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1a2027] border border-[#2a3340] flex items-center justify-center text-[#94a3b8] shrink-0">
                      <span className="material-symbols-outlined text-lg opacity-60">person_add</span>
                    </div>
                    <div>
                      <span className="font-semibold text-xs sm:text-sm text-[#dde3ed] block">
                        Empty Seat
                      </span>
                      <span className="text-[10px] sm:text-xs text-[#94a3b8] block">
                        Open for learners
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyInvite}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#242a32] hover:bg-[#2f353d] text-[11px] font-semibold text-[#dde3ed] border border-[#2a3340] transition-colors cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3 h-3 text-[#22c55e]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#22c55e]" />
                        <span>Invite</span>
                      </>
                    )}
                  </button>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================= 3. FIXED BACKCHANNEL MESSENGER (col-span-4) ================= */}
        <aside className="lg:col-span-4 bg-[#161c23] border border-[#2a3340] rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-2xl md:sticky md:top-20 md:h-[calc(100vh-6rem)] md:max-h-[750px] min-h-[480px]">
          {/* Header (Clean, extra descriptions removed) */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#2a3340]">
            <span className="font-bold text-xs sm:text-sm text-[#dde3ed] flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#22c55e]" />
              Room Backchannel
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#242a32] text-[#22c55e]">
              {messages.length} messages
            </span>
          </div>

          {/* Quick Floating Reaction Bar */}
          <div className="flex items-center justify-between py-2 border-b border-[#2a3340]/60 gap-1 overflow-x-auto">
            {["🎯", "👏", "❤️", "😂", "🔥", "💡"].map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTriggerReaction(emoji)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#1a2027] hover:bg-[#242a32] transition-colors text-sm sm:text-base flex items-center justify-center border border-[#2a3340] cursor-pointer"
                title={`Send ${emoji}`}
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          {/* Messages Stream with Individual Message Reactions */}
          <div className="flex-1 overflow-y-auto py-2.5 space-y-2.5 pr-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 gap-2.5 text-[#94a3b8]">
                <div className="w-10 h-10 rounded-full bg-[#1a2027] border border-[#2a3340] flex items-center justify-center text-[#22c55e]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-[#dde3ed] block">
                    Backchannel Ready
                  </span>
                  <span className="text-[11px]">Send vocabulary, phrases, or quick icebreakers</span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {["Hello everyone! 👋", "Can everyone hear me? 🎙️", "Ready to practice! 🚀"].map(
                    (starter) => (
                      <button
                        key={starter}
                        onClick={() => sendMessage(starter)}
                        className="px-2 py-0.5 rounded-md bg-[#242a32] hover:bg-[#2f353d] text-[#dde3ed] text-[10px] sm:text-xs border border-[#2a3340] transition-colors cursor-pointer"
                      >
                        {starter}
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isSenderHost =
                    msg.sender?.id === (currentRoom?.host?.id || room.host.id) ||
                    msg.sender?.name === (currentRoom?.host?.name || room.host.name);

                  const reactionData = getReactionCounts(msg.reactions);

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 450, damping: 25 }}
                      className={`group/msg relative p-2.5 rounded-xl flex gap-2.5 text-xs border transition-colors ${
                        msg.isHighlighted
                          ? "bg-[#22c55e]/10 border-[#22c55e]/40 text-[#dde3ed]"
                          : isSenderHost
                          ? "bg-[#1a2027] border-[#2a3340] text-[#dde3ed]"
                          : "bg-[#1a2027]/70 border-[#2a3340]/60 text-[#dde3ed]"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="shrink-0 pt-0.5">
                        {msg.sender?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={msg.sender.avatarUrl}
                            alt={msg.sender.name || "User"}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-[#2a3340]"
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#242a32] border border-[#2a3340] flex items-center justify-center font-bold text-xs text-[#22c55e]">
                            {msg.sender?.name ? msg.sender.name.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                      </div>

                      {/* Message Content Body */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`font-semibold text-xs truncate ${
                                isSenderHost ? "text-[#22c55e]" : "text-[#dde3ed]"
                              }`}
                            >
                              {msg.sender?.name || "Learner"}
                            </span>
                            {isSenderHost && (
                              <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-[#242a32] text-[#22c55e] border border-[#2a3340] font-bold shrink-0">
                                Host
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] text-[#94a3b8] font-mono">
                              {msg.createdAt}
                            </span>
                          </div>
                        </div>

                        {/* Hover Quick Reaction Toolbar (Discord-style) */}
                        <div className="absolute right-2 -top-2.5 hidden group-hover/msg:flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-[#12171e] border border-[#2a3340] shadow-xl z-20">
                          {AVAILABLE_REACTIONS.slice(0, 5).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => reactToMessage(msg.id, emoji)}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#242a32] text-xs transition-transform hover:scale-125 cursor-pointer"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMessagePicker(
                                activeMessagePicker === msg.id ? null : msg.id
                              )
                            }
                            className="p-0.5 rounded hover:bg-[#242a32] text-[#94a3b8] hover:text-[#22c55e] transition-colors cursor-pointer"
                            title="More reactions"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Text Message */}
                        {msg.content && (
                          <p className="text-xs leading-relaxed break-words font-sans text-[#c0c7d4] whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}

                        {/* Inline Image Attachment Thumbnail */}
                        {msg.mediaUrl && (
                          <div className="mt-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.mediaUrl}
                              alt="Attachment preview"
                              onClick={() => setActiveLightboxImage(msg.mediaUrl!)}
                              className="max-h-56 max-w-full rounded-xl object-cover cursor-pointer border border-[#2a3340] hover:border-[#22c55e] transition-all shadow-md hover:scale-[1.01]"
                            />
                          </div>
                        )}

                        {/* Floating Emoji Picker Popover */}
                        {activeMessagePicker === msg.id && (
                          <div className="flex items-center gap-1 bg-[#12171e] p-1.5 rounded-lg border border-[#2a3340] shadow-xl mt-1 w-fit z-30">
                            {AVAILABLE_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  reactToMessage(msg.id, emoji);
                                  setActiveMessagePicker(null);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#242a32] text-sm hover:scale-125 transition-transform cursor-pointer"
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Display Active Reaction Pill Badges */}
                        {reactionData.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 mt-0.5">
                            {reactionData.map((r) => {
                              const isUserReacted = r.users.includes(user?.id || "");
                              return (
                                <button
                                  key={r.emoji}
                                  type="button"
                                  onClick={() => reactToMessage(msg.id, r.emoji)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                                    isUserReacted
                                      ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-sm font-bold hover:bg-[#22c55e]/30"
                                      : "bg-[#242a32] border-[#2a3340] text-[#dde3ed] hover:border-[#94a3b8]/50 hover:bg-[#2c333e]"
                                  }`}
                                  title={
                                    isUserReacted
                                      ? `You reacted with ${r.emoji} (click to remove)`
                                      : `Click to react with ${r.emoji}`
                                  }
                                >
                                  <span className="text-xs">{r.emoji}</span>
                                  <span className="font-mono">{r.count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input & Media Attachment Controls */}
          <form onSubmit={handleSendMessage} className="pt-2.5 border-t border-[#2a3340] relative">
            {/* Pending Attachment Preview Chip */}
            {pendingFile && (
              <div className="mb-2 p-1.5 rounded-lg bg-[#242a32] border border-[#2a3340] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {pendingFilePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingFilePreview}
                      alt="Preview"
                      className="w-9 h-9 rounded-md object-cover border border-[#2a3340] shrink-0"
                    />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-medium text-[#dde3ed] truncate max-w-[180px]">
                      {pendingFile.name}
                    </span>
                    <span className="text-[9px] text-[#94a3b8]">
                      {(pendingFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearPendingFile}
                  disabled={isUploading}
                  className="p-1 rounded-md hover:bg-[#1a2027] text-[#94a3b8] hover:text-red-400 transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            <div className="relative flex items-center">
              {/* Paperclip Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute left-2 p-1 rounded-md text-[#94a3b8] hover:text-[#22c55e] hover:bg-[#242a32] transition-colors cursor-pointer disabled:opacity-40"
                title="Attach image (PNG, JPEG, WebP, GIF)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isUploading}
                placeholder={isUploading ? "Uploading attachment..." : "Type a message or press Enter..."}
                className="w-full bg-[#1a2027] text-[#dde3ed] placeholder:text-[#94a3b8] text-xs sm:text-sm pl-9 pr-10 py-2 rounded-lg sm:rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-all disabled:opacity-50"
              />

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="submit"
                disabled={(!inputText.trim() && !pendingFile) || isUploading}
                className="absolute right-1.5 p-1.5 rounded-lg bg-[#22c55e] text-[#003915] hover:bg-[#4be277] disabled:opacity-40 disabled:hover:bg-[#22c55e] transition-colors cursor-pointer flex items-center justify-center"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </motion.button>
            </div>
          </form>
        </aside>
      </div>

      {/* High-Resolution Interactive Image Lightbox Modal */}
      <ImageLightbox
        imageUrl={activeLightboxImage}
        onClose={() => setActiveLightboxImage(null)}
      />
    </div>
  );
}
