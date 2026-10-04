"use client";

import React, { useState, useRef, useEffect } from "react";
import { useVoiceRoom, useMessenger, useDevices, useSpeakingDetection } from "@/hooks";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingReactionItem, FloatingReactions } from "./motion/FloatingReaction";
import { MotionButton } from "./motion/MotionButton";
import { TacticalEqualizer } from "./motion/TacticalEqualizer";
import { SpeakingRipple } from "./motion/SpeakingRipple";


interface LiveVoiceRoomProps {
  room: VoiceRoom;
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
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
    toggleHandRaised,
    leaveRoom,
  } = useVoiceRoom(room);

  const { messages, sendMessage, sendReaction } = useMessenger(
    currentRoom?.id || room.id,
    currentRoom?.messages || room.messages
  );

  const { audioInputId, microphones } = useDevices();
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const user = useAuthStore((s) => s.user);

  // Messenger local input
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Floating live emoji reactions
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);

  // Hook into speaking detection
  const [localStream] = useState<MediaStream | null>(null);
  const { isSpeaking } = useSpeakingDetection(localStream);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeMicLabel =
    microphones.find((m) => m.deviceId === audioInputId)?.label || "AirPods Pro (Alex)";

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText("");
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
    <div className="w-full px-4 sm:px-6 py-4 max-w-[1680px] mx-auto flex flex-col gap-4 animate-fade-in relative">
      {/* Floating Reactions Overlay */}
      <FloatingReactions reactions={floatingReactions} />

      {/* 1. TOP ROOM CONTROL BAR */}
      <header className="w-full bg-[#161c23]/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#2a3340]/80 shadow-2xl flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
        {/* Room Context & Identity */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#242a32] text-[#22c55e] border border-[#2a3340] shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-2xl font-bold">local_cafe</span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-base sm:text-lg text-[#dde3ed] truncate max-w-xl">
                {currentRoom?.title || room.title}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#242a32] text-[#22c55e] border border-[#2a3340] text-xs font-semibold">
                <span>{currentRoom?.flag || room.flag}</span>
                <span>{currentRoom?.language || room.language}</span> •{" "}
                <span>{currentRoom?.levelLabel || room.levelLabel}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-[#94a3b8] text-xs mt-1">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#dde3ed]">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping"></span>
                <span className="w-2 h-2 rounded-full bg-[#22c55e] -ml-3.5"></span>
                <span>Live: {formattedDuration}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#22c55e]">
                <span className="material-symbols-outlined text-sm">wifi</span>
                <span>{networkLatency}ms mesh</span>
              </span>
              <span>•</span>
              <span className="text-[#94a3b8]">
                {participantsList.length} / {maxSlots} slots filled
              </span>
            </div>
          </div>
        </div>

        {/* Central Audio & Tactical Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
          {/* Mic Toggle with Live Peak Glow */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-md cursor-pointer ${!isMuted
                ? "bg-[#22c55e] text-[#003915] hover:bg-[#4be277] shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                : "bg-[#242a32] text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#2f353d]"
              }`}
          >
            {!isMuted ? (
              <>
                <TacticalEqualizer isActive={true} barCount={3} size="sm" color="#003915" />
                <Mic className="w-4 h-4" />
                <span className="hidden md:inline">Transmitting</span>
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4" />
                <span className="hidden md:inline">Muted</span>
              </>
            )}
          </motion.button>

          {/* Deafen Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDeafen}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${isDeafened
                ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
              }`}
            title={isDeafened ? "Sound Muted (Deafened)" : "Sound Active"}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </motion.button>

          {/* Screen Share Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleScreenShare}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${isScreenSharing
                ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
              }`}
            title="Share screen / learning material"
          >
            <Share2 className="w-5 h-5" />
          </motion.button>

          {/* Raise Hand Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleHandRaised}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${handRaised
                ? "bg-[#eab308]/20 border-[#eab308] text-[#eab308]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
              }`}
            title="Raise Hand"
          >
            <Hand className="w-5 h-5" />
          </motion.button>

          {/* Audio Output Dropdown */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="hidden xl:flex items-center gap-1.5 bg-[#1a2027] border border-[#2a3340] px-3 py-1.5 rounded-xl text-xs text-[#94a3b8] hover:text-[#dde3ed] transition-colors cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5 text-[#22c55e]" />
            <span className="text-[#dde3ed] font-medium max-w-[140px] truncate">
              {activeMicLabel}
            </span>
          </button>

          {/* Leave Room Action */}
          <MotionButton
            variant="danger"
            size="sm"
            onClick={leaveRoom}
            className="ml-1"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave</span>
          </MotionButton>
        </div>
      </header>

      {/* 2. MAIN ACTIVE WORKSPACE: STAGE (LEFT) & CHAT (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= PARTICIPANT STAGE (col-span-8) ================= */}
        <section className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between bg-[#161c23] border border-[#2a3340] rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping"></span>
              <span className="text-xs font-bold text-[#dde3ed] tracking-wider uppercase">
                Interactive Voice Stage
              </span>
            </div>
            <span className="text-xs text-[#94a3b8]">
              Opus Voice Codec 48kHz • Full Duplex
            </span>
          </div>

          {/* Participants Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {participantsList.map((p) => {
              const isCurrentUser = p.id === user?.id || p.isHost;
              const speakerActive =
                (p.isSpeaking || (isCurrentUser && !isMuted && isSpeaking)) && !p.isMuted;

              return (
                <motion.div
                  key={p.id}
                  layout="position"
                  className={`relative rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[230px] transition-colors border ${speakerActive
                      ? "bg-[#1a2027] border-[#22c55e] shadow-[0_0_24px_rgba(34,197,94,0.2)]"
                      : "bg-[#161c23] border-[#2a3340]/80"
                    }`}
                >
                  {/* Speaking Radial Glow */}
                  {speakerActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/15 via-transparent to-transparent pointer-events-none rounded-2xl"
                    />
                  )}

                  {/* Tile Top Header */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      {p.isHost && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#242a32] text-[#22c55e] font-bold text-[11px] border border-[#2a3340]">
                          <Sparkles className="w-3 h-3 text-[#22c55e]" />
                          HOST
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 rounded-md bg-[#22c55e]/20 text-[#22c55e] font-bold text-[11px] border border-[#22c55e]/30">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-[#090f15]/80 px-2 py-1 rounded-lg border border-[#2a3340]">
                      {speakerActive ? (
                        <>
                          <TacticalEqualizer isActive={true} barCount={3} size="sm" />
                          <span className="text-[#22c55e] font-bold text-[10px] uppercase tracking-wide">
                            Transmitting
                          </span>
                        </>
                      ) : p.isMuted ? (
                        <>
                          <MicOff className="w-3 h-3 text-[#ef4444]" />
                          <span className="text-[#ef4444] font-medium text-[10px] uppercase">
                            Muted
                          </span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-[#94a3b8]" />
                          <span className="text-[#94a3b8] font-medium text-[10px] uppercase">
                            Listening
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tile Center Avatar */}
                  <div className="relative z-10 flex flex-col items-center justify-center my-3">
                    <div className="relative flex items-center justify-center">
                      {/* Realistic concentric speaking ripple */}
                      {speakerActive && (
                        <SpeakingRipple size={80} isActive={true} />
                      )}

                      <div
                        className={`relative w-20 h-20 rounded-full p-1 transition-all ${speakerActive
                            ? "bg-gradient-to-tr from-[#22c55e] to-[#4be277] shadow-[0_0_20px_rgba(34,197,94,0.5)] scale-105"
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
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#161c23] ${p.isMuted ? "bg-[#ef4444] text-white" : "bg-[#22c55e] text-[#003915]"
                          }`}
                      >
                        {p.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      </span>
                    </div>

                    <span className="font-bold text-base text-[#dde3ed] mt-2.5">{p.name}</span>
                    <span className="text-xs text-[#94a3b8]">
                      {p.location || "Global"} • {p.learningLanguage} (
                      {p.cefrPortfolio?.[room.language] || "Learner"})
                    </span>
                  </div>

                  {/* Tile Bottom Waveform or Status Bar */}
                  <div className="relative z-10 w-full flex items-center justify-between pt-2 border-t border-[#2a3340]/60">
                    <span className="text-[11px] text-[#94a3b8] font-mono">
                      Native: {p.nativeLanguage}
                    </span>

                    {speakerActive ? (
                      <TacticalEqualizer isActive={true} barCount={4} size="sm" />
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-[#94a3b8]">
                        <Headphones className="w-3 h-3" />
                        <span>Connected</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, maxSlots - participantsList.length) }).map(
              (_, index) => (
                <div
                  key={`stage-empty-${index}`}
                  className="rounded-2xl p-6 border-2 border-dashed border-[#2a3340] bg-[#161c23]/40 flex flex-col items-center justify-center text-center gap-3 min-h-[230px]"
                >
                  <div className="w-14 h-14 rounded-full bg-[#1a2027] border border-[#2a3340] flex items-center justify-center text-[#94a3b8]">
                    <span className="material-symbols-outlined text-2xl opacity-60">person_add</span>
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[#dde3ed] block">
                      Empty Speaker Seat
                    </span>
                    <span className="text-xs text-[#94a3b8]">
                      Invite a language peer or share room link
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================= BACKCHANNEL MESSENGER (col-span-4) ================= */}
        <aside className="lg:col-span-4 bg-[#161c23] border border-[#2a3340] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[680px] shadow-2xl">
          {/* Header */}
          <div className="flex flex-col gap-2 pb-3 border-b border-[#2a3340]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#dde3ed] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#22c55e]" />
                Room Backchannel & Notes
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#242a32] text-[#22c55e]">
                {messages.length} messages
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Share vocab, phrases, spellings and grammar explanations live.
            </p>
          </div>

          {/* Quick Reaction Bar */}
          <div className="flex items-center justify-between py-2 border-b border-[#2a3340]/60 gap-1 overflow-x-auto">
            {["🎯", "👏", "❤️", "😂", "🔥", "💡"].map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTriggerReaction(emoji)}
                className="w-8 h-8 rounded-lg bg-[#1a2027] hover:bg-[#242a32] transition-colors text-base flex items-center justify-center border border-[#2a3340] cursor-pointer"
                title={`Send ${emoji}`}
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          {/* Messages Stream with AnimatePresence */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isSenderHost = msg.sender.name === "Alex Miller";

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    className={`p-3 rounded-xl flex flex-col gap-1 text-xs border ${msg.isHighlighted
                        ? "bg-[#22c55e]/10 border-[#22c55e]/40 text-[#dde3ed]"
                        : isSenderHost
                          ? "bg-[#1a2027] border-[#2a3340] text-[#dde3ed]"
                          : "bg-[#1a2027]/70 border-[#2a3340]/60 text-[#dde3ed]"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${isSenderHost ? "text-[#22c55e]" : "text-[#c0c7d4]"}`}>
                          {msg.sender.name}
                        </span>
                        {isSenderHost && (
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[#242a32] text-[#22c55e] border border-[#2a3340]">
                            Host
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#94a3b8] font-mono">{msg.createdAt}</span>
                    </div>

                    <p className="text-xs leading-relaxed break-words font-sans">{msg.content}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-[#2a3340] relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a word, phrase or translation..."
                className="w-full bg-[#1a2027] text-[#dde3ed] placeholder:text-[#94a3b8] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] pr-12 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="submit"
                disabled={!inputText.trim()}
                className="absolute right-2 p-1.5 rounded-lg bg-[#22c55e] text-[#003915] hover:bg-[#4be277] disabled:opacity-40 disabled:hover:bg-[#22c55e] transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
