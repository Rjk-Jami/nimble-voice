"use client";

import React, { useState, useEffect, useRef } from "react";
import { VoiceRoom, ChatMessage, Participant } from "@/lib/data";

interface LiveVoiceRoomProps {
  room: VoiceRoom;
  onLeaveRoom: () => void;
  onOpenSettings: () => void;
}

export function LiveVoiceRoom({
  room,
  onLeaveRoom,
  onOpenSettings,
}: LiveVoiceRoomProps) {
  // Voice Call State
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [hasRaisedHand, setHasRaisedHand] = useState<boolean>(false);
  const [activeAudioDevice, setActiveAudioDevice] = useState<string>("AirPods Pro (Alex)");
  const [callSeconds, setCallSeconds] = useState<number>(room.activeSinceMinutes * 60 + 15);

  // Messenger State
  const [messages, setMessages] = useState<ChatMessage[]>(room.messages || []);
  const [inputText, setInputText] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Participants in call
  const [participants, setParticipants] = useState<Participant[]>(room.participants);

  // Simulated timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format call timer mm:ss or hh:mm:ss
  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "Alex Miller",
      senderId: "p-1",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isHost: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  // Send quick reaction
  const handleSendReaction = (emoji: string) => {
    const newMsg: ChatMessage = {
      id: `reaction-${Date.now()}`,
      sender: "Alex Miller",
      text: `${emoji} reacted`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
    setParticipants((prev) =>
      prev.map((p) => (p.isHost ? { ...p, isMuted: !p.isMuted, isSpeaking: p.isMuted ? false : p.isSpeaking } : p))
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 py-4 max-w-[1680px] mx-auto flex flex-col gap-4">
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
                {room.title}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#242a32] text-[#22c55e] border border-[#2a3340] text-xs font-semibold">
                <span>{room.flag}</span>
                <span>{room.language}</span> • <span>{room.levelLabel}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-[#94a3b8] text-xs mt-1">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#dde3ed]">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping"></span>
                <span className="w-2 h-2 rounded-full bg-[#22c55e] -ml-3.5"></span>
                <span>Live: {formatTimer(callSeconds)}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#22c55e]">
                <span className="material-symbols-outlined text-sm">wifi</span>
                <span>24ms mesh</span>
              </span>
              <span>•</span>
              <span className="text-[#94a3b8]">
                {participants.length} / {room.maxParticipants} slots filled
              </span>
            </div>
          </div>
        </div>

        {/* Central Audio & Tactical Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
          {/* Mic Toggle with Live Peak Glow */}
          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer ${
              !isMuted
                ? "bg-[#22c55e] text-[#003915] hover:bg-[#4be277] shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                : "bg-[#242a32] text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#2f353d]"
            }`}
          >
            {!isMuted ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#003915] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#003915]"></span>
                </span>
                <span className="material-symbols-outlined text-lg leading-none">mic</span>
                <span className="hidden md:inline">Speaking</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg leading-none">mic_off</span>
                <span className="hidden md:inline">Muted</span>
              </>
            )}
          </button>

          {/* Deafen Toggle */}
          <button
            onClick={() => setIsDeafened((prev) => !prev)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDeafened
                ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
            }`}
            title={isDeafened ? "Sound Muted (Deafened)" : "Sound Active"}
          >
            <span className="material-symbols-outlined text-xl leading-none">
              {isDeafened ? "volume_off" : "volume_up"}
            </span>
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={() => setIsSharingScreen((prev) => !prev)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isSharingScreen
                ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
            }`}
            title="Share screen / learning material"
          >
            <span className="material-symbols-outlined text-xl leading-none">present_to_all</span>
          </button>

          {/* Raise Hand Toggle */}
          <button
            onClick={() => {
              setHasRaisedHand((prev) => !prev);
              if (!hasRaisedHand) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `hand-${Date.now()}`,
                    sender: "Alex Miller",
                    text: "✋ Raised hand to speak next",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  },
                ]);
              }
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              hasRaisedHand
                ? "bg-[#eab308]/20 border-[#eab308] text-[#eab308]"
                : "bg-[#1a2027] border-[#2a3340] text-[#dde3ed] hover:bg-[#242a32]"
            }`}
            title="Raise Hand"
          >
            <span className="material-symbols-outlined text-xl leading-none">front_hand</span>
          </button>

          {/* Audio Output Dropdown */}
          <div className="hidden xl:flex items-center gap-1.5 bg-[#1a2027] border border-[#2a3340] px-3 py-1.5 rounded-xl text-xs text-[#94a3b8]">
            <span className="material-symbols-outlined text-sm text-[#22c55e]">headphones</span>
            <span className="text-[#dde3ed] font-medium">{activeAudioDevice}</span>
          </div>

          {/* Leave Room Action */}
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ef4444] text-white hover:bg-red-600 transition-all font-bold text-xs sm:text-sm shadow-md active:scale-95 cursor-pointer ml-1"
          >
            <span className="material-symbols-outlined text-base leading-none">call_end</span>
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN ACTIVE WORKSPACE: STAGE (LEFT) & CHAT (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= PARTICIPANT STAGE (col-span-8) ================= */}
        <section className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          {/* Active Voice Stage Banner */}
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

          {/* Participants Matrix (2x2 or 3x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {participants.map((p) => {
              const isCurrentUser = p.isHost;
              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[230px] transition-all border ${
                    p.isSpeaking && !p.isMuted
                      ? "bg-[#1a2027] border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                      : "bg-[#161c23] border-[#2a3340]/80"
                  }`}
                >
                  {/* Subtle Speaking Radial Glow */}
                  {p.isSpeaking && !p.isMuted && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/10 via-transparent to-transparent pointer-events-none rounded-2xl"></div>
                  )}

                  {/* Tile Top Header */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      {p.isHost && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#242a32] text-[#22c55e] font-bold text-[11px] border border-[#2a3340]">
                          <span className="material-symbols-outlined text-xs">hotel_class</span>
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
                      {p.isSpeaking && !p.isMuted ? (
                        <>
                          <span className="material-symbols-outlined text-xs text-[#22c55e]">graphic_eq</span>
                          <span className="text-[#22c55e] font-bold text-[10px] uppercase tracking-wide">
                            Transmitting
                          </span>
                        </>
                      ) : p.isMuted ? (
                        <>
                          <span className="material-symbols-outlined text-xs text-[#ef4444]">mic_off</span>
                          <span className="text-[#ef4444] font-medium text-[10px] uppercase">
                            Muted
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs text-[#94a3b8]">volume_up</span>
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
                      {p.isSpeaking && !p.isMuted && (
                        <div className="absolute w-24 h-24 rounded-full bg-[#22c55e]/20 animate-ping"></div>
                      )}
                      <div
                        className={`relative w-20 h-20 rounded-full p-1 transition-all ${
                          p.isSpeaking && !p.isMuted
                            ? "bg-gradient-to-tr from-[#22c55e] to-[#4be277] shadow-[0_0_16px_rgba(34,197,94,0.4)]"
                            : "bg-[#242a32]"
                        }`}
                      >
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>

                      {/* Floating Mic status marker */}
                      <span
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#161c23] ${
                          p.isMuted
                            ? "bg-[#ef4444] text-white"
                            : "bg-[#22c55e] text-[#003915]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {p.isMuted ? "mic_off" : "mic"}
                        </span>
                      </span>
                    </div>

                    <span className="font-bold text-base text-[#dde3ed] mt-2.5">
                      {p.name}
                    </span>
                    <span className="text-xs text-[#94a3b8]">
                      {p.location} • {p.learningLanguage} ({p.cefrLevel})
                    </span>
                  </div>

                  {/* Tile Bottom Waveform or Status Bar */}
                  <div className="relative z-10 w-full flex items-center justify-between pt-2 border-t border-[#2a3340]/60">
                    <span className="text-[11px] text-[#94a3b8] font-mono">
                      Native: {p.nativeLanguage}
                    </span>

                    {p.isSpeaking && !p.isMuted ? (
                      <div className="flex items-end gap-1 h-3.5">
                        <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-1 h-3"></span>
                        <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-2 h-4"></span>
                        <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-3 h-2.5"></span>
                        <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-4 h-3.5"></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-[#94a3b8]">
                        <span className="material-symbols-outlined text-xs">headphones</span>
                        <span>Connected</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty Slots to reach capacity */}
            {Array.from({ length: Math.max(0, room.maxParticipants - participants.length) }).map(
              (_, index) => (
                <div
                  key={`stage-empty-${index}`}
                  className="rounded-2xl p-6 border-2 border-dashed border-[#2a3340] bg-[#161c23]/40 flex flex-col items-center justify-center text-center gap-3 min-h-[230px]"
                >
                  <div className="w-14 h-14 rounded-full bg-[#1a2027] border border-[#2a3340] flex items-center justify-center text-[#94a3b8]">
                    <span className="material-symbols-outlined text-2xl opacity-60">person_add</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#dde3ed]">Open Speaking Slot</h4>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      Learners from the lobby can join in real-time
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Room invitation link copied to clipboard!");
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#242a32] hover:bg-[#2f353d] text-xs font-semibold text-[#22c55e] border border-[#2a3340] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">share</span>
                    <span>Copy Invite Link</span>
                  </button>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================= BACKCHANNEL MESSENGER (col-span-4) ================= */}
        <aside className="lg:col-span-4 bg-[#161c23] border border-[#2a3340] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[680px] shadow-2xl">
          {/* Backchannel Header */}
          <div className="flex flex-col gap-2 pb-3 border-b border-[#2a3340]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#dde3ed] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#22c55e] text-lg">chat</span>
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
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="w-8 h-8 rounded-lg bg-[#1a2027] hover:bg-[#242a32] hover:scale-110 active:scale-95 transition-all text-base flex items-center justify-center border border-[#2a3340] cursor-pointer"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-xl flex flex-col gap-1 text-xs border ${
                  msg.isHighlighted
                    ? "bg-[#22c55e]/10 border-[#22c55e]/40 text-[#dde3ed]"
                    : msg.isHost
                    ? "bg-[#1a2027] border-[#2a3340] text-[#dde3ed]"
                    : "bg-[#1a2027]/70 border-[#2a3340]/60 text-[#dde3ed]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-bold ${
                        msg.isHost ? "text-[#22c55e]" : "text-[#c0c7d4]"
                      }`}
                    >
                      {msg.sender}
                    </span>
                    {msg.isHost && (
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[#242a32] text-[#22c55e] border border-[#2a3340]">
                        Host
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#94a3b8] font-mono">{msg.time}</span>
                </div>

                <p className="text-xs leading-relaxed break-words font-sans">{msg.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Field */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-[#2a3340] relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a word, phrase or translation..."
                className="w-full bg-[#1a2027] text-[#dde3ed] placeholder:text-[#94a3b8] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] pr-12 transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="absolute right-2 p-1.5 rounded-lg bg-[#22c55e] text-[#003915] hover:bg-[#4be277] disabled:opacity-40 disabled:hover:bg-[#22c55e] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base leading-none">send</span>
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
