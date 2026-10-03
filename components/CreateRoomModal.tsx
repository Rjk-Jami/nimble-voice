"use client";

import React, { useState } from "react";
import { VoiceRoom, LANGUAGES } from "@/lib/data";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (newRoom: VoiceRoom) => void;
  initialTopic?: string;
  initialLanguage?: string;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  onCreateRoom,
  initialTopic = "",
  initialLanguage = "English",
}: CreateRoomModalProps) {
  const [title, setTitle] = useState<string>(initialTopic || "");
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [cefrLevel, setCefrLevel] = useState<'ANY' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE'>("ANY");
  const [maxParticipants, setMaxParticipants] = useState<number>(5);
  const [topicTag, setTopicTag] = useState<string>("Casual & Life");
  const [isBeginnerFriendly, setIsBeginnerFriendly] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const matchedLang = LANGUAGES.find((l) => l.name.toLowerCase() === language.toLowerCase()) || {
      name: language,
      flag: "🌐",
    };

    let levelLabel = "All Levels Welcome";
    if (cefrLevel === "A1" || cefrLevel === "A2") levelLabel = "Beginner Friendly";
    else if (cefrLevel === "B1" || cefrLevel === "B2") levelLabel = "Intermediate";
    else if (cefrLevel === "C1" || cefrLevel === "C2") levelLabel = "Advanced";
    else if (cefrLevel === "NATIVE") levelLabel = "Native Speakers";

    const newRoom: VoiceRoom = {
      id: `room-${Date.now()}`,
      title: title.trim(),
      language: matchedLang.name,
      flag: matchedLang.flag,
      cefrLevel,
      levelLabel,
      topicTag,
      activeSinceMinutes: 1,
      maxParticipants,
      hasFreeSeats: true,
      isBeginnerFriendly,
      hasNativeSpeaker: false,
      isLive: true,
      participants: [
        {
          id: `p-host-${Date.now()}`,
          name: "Alex Miller",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          location: "San Francisco, CA",
          nativeLanguage: "English",
          learningLanguage: matchedLang.name,
          cefrLevel: "NATIVE",
          isHost: true,
          isSpeaking: false,
          isMuted: false,
          audioLevel: 0,
        },
      ],
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: "System",
          text: `Room created! Welcome to ${title.trim()}.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isSystem: true,
        },
      ],
    };

    onCreateRoom(newRoom);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161c23] border border-[#2a3340] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3340]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center border border-[#22c55e]/40">
              <span className="material-symbols-outlined text-xl">add_circle</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-[#dde3ed]">Create a New Voice Room</h3>
              <p className="text-xs text-[#94a3b8]">Start speaking with international peers instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Room Title */}
          <div>
            <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">
              Room Title / Discussion Topic *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily routine, travel stories, favorite books..."
              className="w-full bg-[#1a2027] text-[#dde3ed] placeholder:text-[#94a3b8] text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-all"
            />
          </div>

          {/* Language and CEFR Level in 2 cols */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#1a2027] text-[#dde3ed] text-sm px-3 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
              >
                {LANGUAGES.filter((l) => l.code !== "all").map((l) => (
                  <option key={l.code} value={l.name}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">Level Requirement</label>
              <select
                value={cefrLevel}
                onChange={(e) => setCefrLevel(e.target.value as any)}
                className="w-full bg-[#1a2027] text-[#dde3ed] text-sm px-3 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
              >
                <option value="ANY">Any Level Welcome</option>
                <option value="A1">Beginner (A1-A2)</option>
                <option value="B1">Intermediate (B1-B2)</option>
                <option value="C1">Advanced (C1-C2)</option>
                <option value="NATIVE">Native Speakers Only</option>
              </select>
            </div>
          </div>

          {/* Participant limit & Topic Tag */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">
                Max Speakers: <span className="text-[#22c55e] font-bold">{maxParticipants}</span>
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                className="w-full accent-[#22c55e] cursor-pointer mt-1"
              />
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                <span>2 (Pair)</span>
                <span>5 (Standard)</span>
                <span>8 (Group)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">Category Tag</label>
              <select
                value={topicTag}
                onChange={(e) => setTopicTag(e.target.value)}
                className="w-full bg-[#1a2027] text-[#dde3ed] text-sm px-3 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
              >
                <option value="Casual & Life">#Casual & Life</option>
                <option value="Grammar & Vocab">#Grammar & Vocab</option>
                <option value="Culture & Travel">#Culture & Travel</option>
                <option value="Tech & Business">#Tech & Business</option>
                <option value="Exam Prep (IELTS/DELE)">#Exam Prep</option>
                <option value="Pop Culture & Movies">#Pop Culture</option>
              </select>
            </div>
          </div>

          {/* Beginner Friendly Toggle */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer">
            <input
              type="checkbox"
              checked={isBeginnerFriendly}
              onChange={(e) => setIsBeginnerFriendly(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#dde3ed]">Patient & Beginner-Friendly Room</span>
              <span className="text-[11px] text-[#94a3b8]">Welcoming atmosphere with slower pacing for learners</span>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a3340]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#22c55e] text-[#003915] font-bold text-xs sm:text-sm hover:bg-[#4be277] transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">podcasts</span>
              <span>Launch Room & Join</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
