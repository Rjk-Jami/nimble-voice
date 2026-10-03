"use client";

import React from "react";
import { useRooms } from "@/hooks";
import { useUIStore } from "@/stores";
import { Language, LANGUAGE_FLAGS } from "@/enums";
import { Search, PlusCircle, Headphones, X, Users, Disc3, ShieldCheck } from "lucide-react";

export function LobbyView() {
  const {
    rooms,
    searchQuery,
    selectedLanguage,
    activeFilter,
    liveStats,
    setSearchQuery,
    setSelectedLanguage,
    setActiveFilter,
    joinRoom,
  } = useRooms();

  const openCreateModal = useUIStore((s) => s.openCreateModal);

  const languageOptions = Object.values(Language);

  return (
    <div className="w-full px-4 sm:px-6 py-6 flex flex-col gap-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* 1. TOP LIVE STATS RIBBON & BANNER */}
      <div className="w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#161c23] p-4 sm:p-5 rounded-2xl border border-[#2a3340]/60 shadow-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#242a32] rounded-full border border-[#2a3340]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-ping"></span>
            <span className="w-2 h-2 rounded-full bg-[#22c55e] -ml-4"></span>
            <span className="text-xs font-bold text-[#dde3ed] tracking-wider uppercase">
              Global Audio Network
            </span>
          </div>

          <div className="flex items-center gap-3 text-[#94a3b8] text-xs sm:text-sm flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-[#dde3ed]">
              <Users className="w-4 h-4 text-[#22c55e]" />
              {liveStats.onlineCount.toLocaleString()}{" "}
              <span className="font-normal text-[#94a3b8]">online learners</span>
            </span>
            <span className="opacity-40">•</span>
            <span className="flex items-center gap-1 font-semibold text-[#dde3ed]">
              <Disc3 className="w-4 h-4 text-[#22c55e]" />
              {liveStats.activeRoomsCount}{" "}
              <span className="font-normal text-[#94a3b8]">active voice rooms</span>
            </span>
            <span className="opacity-40">•</span>
            <span className="flex items-center gap-1 font-semibold text-[#dde3ed]">
              <span className="material-symbols-outlined text-[#22c55e] text-base leading-none">
                translate
              </span>
              {liveStats.liveLanguagesCount}{" "}
              <span className="font-normal text-[#94a3b8]">live languages</span>
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 self-end lg:self-auto">
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 bg-[#22c55e] text-[#003915] px-4 py-2 rounded-xl font-bold text-xs sm:text-sm hover:bg-[#4be277] transition-all shadow-[0_0_16px_rgba(34,197,94,0.3)] active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Room</span>
          </button>
          {rooms.length > 0 && (
            <button
              onClick={() => joinRoom(rooms[0])}
              className="flex items-center gap-1.5 bg-[#242a32] hover:bg-[#2f353d] text-[#dde3ed] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors border border-[#2a3340] cursor-pointer"
            >
              <Headphones className="w-4 h-4 text-[#22c55e]" />
              <span className="hidden sm:inline">Active Call Preview</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS BAR */}
      <div className="flex flex-col gap-4 bg-[#161c23] p-4 sm:p-5 rounded-2xl border border-[#2a3340]/60 shadow-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar input with shortcut badge */}
          <div className="relative flex-1 group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] group-focus-within:text-[#22c55e] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room by topic, language or host..."
              className="w-full bg-[#1a2027] text-[#dde3ed] placeholder:text-[#94a3b8] text-sm pl-10 pr-20 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#dde3ed] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block px-1.5 py-0.5 bg-[#242a32] text-[#94a3b8] font-mono text-[10px] rounded border border-[#2a3340]">
              ⌘K
            </kbd>
          </div>

          {/* Quick filter pill toggles */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
            <button
              onClick={() => setActiveFilter(activeFilter === "active" ? null : "active")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                activeFilter === "active"
                  ? "bg-[#22c55e]/15 border-[#22c55e] text-[#22c55e]"
                  : "bg-[#1a2027] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
              Active Only
            </button>
            <button
              onClick={() => setActiveFilter(activeFilter === "free-seats" ? null : "free-seats")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                activeFilter === "free-seats"
                  ? "bg-[#22c55e]/15 border-[#22c55e] text-[#22c55e]"
                  : "bg-[#1a2027] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
              }`}
            >
              <span className="material-symbols-outlined text-xs">event_seat</span>
              With Free Seats
            </button>
            <button
              onClick={() => setActiveFilter(activeFilter === "beginner" ? null : "beginner")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                activeFilter === "beginner"
                  ? "bg-[#22c55e]/15 border-[#22c55e] text-[#22c55e]"
                  : "bg-[#1a2027] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
              }`}
            >
              <span className="material-symbols-outlined text-xs">sentiment_satisfied</span>
              Beginner Friendly
            </button>
            <button
              onClick={() => setActiveFilter(activeFilter === "native" ? null : "native")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                activeFilter === "native"
                  ? "bg-[#22c55e]/15 border-[#22c55e] text-[#22c55e]"
                  : "bg-[#1a2027] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
              Native Speakers
            </button>
          </div>
        </div>

        {/* Horizontally Scrollable Language Carousel with Counts */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth">
          {languageOptions.map((lang) => {
            const isSelected = selectedLanguage === lang;
            const flag = LANGUAGE_FLAGS[lang] || "🌐";
            return (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#22c55e] text-[#003915] shadow-[0_0_12px_rgba(34,197,94,0.35)] scale-105"
                    : "bg-[#1a2027] text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] border border-[#2a3340]"
                }`}
              >
                <span>{flag}</span>
                <span>{lang}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ROOMS DIRECTORY GRID */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#dde3ed] flex items-center gap-2">
          <span>Active Conversation Rooms</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#242a32] text-[#22c55e] border border-[#2a3340]">
            {rooms.length} available
          </span>
        </h2>
        <span className="text-xs text-[#94a3b8]">Live mesh connection • 24ms</span>
      </div>

      {rooms.length === 0 ? (
        <div className="w-full bg-[#161c23] border border-[#2a3340] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#242a32] flex items-center justify-center text-[#94a3b8]">
            <span className="material-symbols-outlined text-3xl">mic_off</span>
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-[#dde3ed]">No active rooms match your filters</h3>
            <p className="text-sm text-[#94a3b8] mt-1">
              Be the first to open a room for{" "}
              {selectedLanguage !== Language.ALL ? selectedLanguage : "this topic"}! Learners are
              waiting to speak.
            </p>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="mt-2 bg-[#22c55e] text-[#003915] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#4be277] transition-all shadow-md cursor-pointer"
          >
            Create this Room Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 w-full">
          {rooms.map((room) => {
            const isFull = room.participants.length >= room.maxSlots;

            return (
              <div
                key={room.id}
                className="group flex flex-col justify-between bg-[#161c23] hover:bg-[#1a2027] border border-[#2a3340]/70 hover:border-[#22c55e]/50 rounded-2xl p-5 transition-all shadow-md hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden"
              >
                {/* Top Bar: Language & Topic Tag */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base">{room.flag}</span>
                      <span className="font-bold text-sm text-[#dde3ed]">{room.language}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#242a32] text-[#22c55e] border border-[#2a3340]">
                        {room.levelLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#94a3b8] font-mono">
                      <span className="material-symbols-outlined text-xs text-[#22c55e]">timer</span>
                      <span>{room.activeSinceMinutes}m live</span>
                    </div>
                  </div>

                  {/* Room Title */}
                  <h3 className="font-bold text-base text-[#dde3ed] group-hover:text-[#4be277] transition-colors line-clamp-2 leading-snug">
                    {room.title}
                  </h3>

                  {/* Topic Badge */}
                  <div className="flex items-center gap-2">
                    {room.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-0.5 rounded-md bg-[#242a32]/70 text-[#94a3b8] border border-[#2a3340]"
                      >
                        #{tag}
                      </span>
                    ))}
                    {room.hasNativeSpeaker && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4be277]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Native host
                      </span>
                    )}
                  </div>
                </div>

                {/* Participants Matrix in Card */}
                <div className="my-5 pt-4 border-t border-[#2a3340]/60 flex items-center justify-between">
                  <div className="flex items-center -space-x-2.5">
                    {room.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="relative group/avatar"
                        title={`${participant.name} (${participant.location || ""}) - ${participant.cefrPortfolio[room.language] || "Learner"}`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full p-0.5 border-2 ${
                            participant.isSpeaking
                              ? "border-[#22c55e] speaking-pulse"
                              : "border-[#161c23]"
                          }`}
                        >
                          <img
                            src={
                              participant.avatarUrl ||
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                            }
                            alt={participant.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        {participant.isSpeaking && (
                          <span className="absolute -bottom-1 -right-0.5 w-4 h-4 rounded-full bg-[#22c55e] text-[#003915] flex items-center justify-center text-[10px]">
                            <span className="material-symbols-outlined text-[10px]">mic</span>
                          </span>
                        )}
                        {participant.isMuted && !participant.isSpeaking && (
                          <span className="absolute -bottom-1 -right-0.5 w-4 h-4 rounded-full bg-[#ef4444] text-white flex items-center justify-center text-[10px]">
                            <span className="material-symbols-outlined text-[10px]">mic_off</span>
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Empty Slots visual */}
                    {Array.from({ length: Math.max(0, room.maxSlots - room.participants.length) }).map(
                      (_, idx) => (
                        <div
                          key={`empty-${idx}`}
                          className="w-10 h-10 rounded-full border-2 border-dashed border-[#2a3340] bg-[#1a2027]/40 flex items-center justify-center text-[#94a3b8] text-xs"
                          title="Open Slot"
                        >
                          <span className="material-symbols-outlined text-sm opacity-40">person_add</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Active Speaker wave */}
                  {room.participants.some((p) => p.isSpeaking) && (
                    <div className="flex items-end gap-1 h-4 px-2 py-1 rounded bg-[#242a32]">
                      <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-1 h-3"></span>
                      <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-2 h-4"></span>
                      <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-3 h-2"></span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Slot count + Join Room Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                    <Users className="w-4 h-4 text-[#22c55e]" />
                    <span className="font-semibold text-[#dde3ed]">
                      {room.participants.length} / {room.maxSlots}
                    </span>
                    <span>slots</span>
                  </div>

                  <button
                    disabled={isFull}
                    onClick={() => joinRoom(room)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      isFull
                        ? "bg-[#242a32] text-[#94a3b8] cursor-not-allowed opacity-60"
                        : "bg-[#22c55e] text-[#003915] hover:bg-[#4be277] shadow-[0_0_12px_rgba(34,197,94,0.3)] active:scale-95"
                    }`}
                  >
                    <span>{isFull ? "Room Full" : "Join Room"}</span>
                    <span className="material-symbols-outlined text-base">login</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
