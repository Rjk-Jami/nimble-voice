"use client";

import React from "react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onOpenAudioSettings: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  inCall?: boolean;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onOpenAudioSettings,
  onOpenSettings,
  onOpenProfile,
  inCall = false,
}: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#161c23]/95 backdrop-blur-md border-b border-[#2a3340]/60 shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
      <div className="h-16 w-full px-4 sm:px-6 flex items-center justify-between gap-3 max-w-[1680px] mx-auto">
        {/* Brand & Main Links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("rooms")}
            className="flex items-center gap-2.5 shrink-0 focus:outline-none group text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#22c55e] to-[#4be277] flex items-center justify-center text-[#003915] shadow-[0_0_12px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl font-bold">graphic_eq</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-[#dde3ed] tracking-tight flex items-center gap-1.5 leading-none">
                NimbleVoice
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                  Live
                </span>
              </span>
              <span className="text-[11px] text-[#94a3b8] tracking-normal font-normal">
                Free4Talk Protocol
              </span>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab("rooms")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "rooms"
                  ? "bg-[#242a32] text-[#22c55e] shadow-sm"
                  : "text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32]/50"
              }`}
            >
              Rooms
            </button>
            <button
              onClick={() => setActiveTab("topics")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "topics"
                  ? "bg-[#242a32] text-[#22c55e] shadow-sm"
                  : "text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32]/50"
              }`}
            >
              Topics & Starters
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "community"
                  ? "bg-[#242a32] text-[#22c55e] shadow-sm"
                  : "text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32]/50"
              }`}
            >
              Community & Safety
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "about"
                  ? "bg-[#242a32] text-[#22c55e] shadow-sm"
                  : "text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32]/50"
              }`}
            >
              About
            </button>
          </nav>
        </div>

        {/* Action Controls & User Tray */}
        <div className="flex items-center gap-3">
          {/* Quick Create Group Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 bg-[#22c55e] text-[#003915] px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm hover:bg-[#4be277] transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">add</span>
            <span className="hidden sm:inline">Create a new group</span>
            <span className="sm:hidden">Create</span>
          </button>

          {/* Social / Coffee Links */}
          <div className="hidden lg:flex items-center gap-1 text-[#94a3b8] border-l border-[#2a3340] pl-3">
            <button
              onClick={() => alert("Coffee Support: Thank you for keeping NimbleVoice servers running free for learners worldwide!")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
            >
              <span className="material-symbols-outlined text-base text-[#eab308]">local_cafe</span>
              <span>Buy me a coffee</span>
            </button>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
            >
              <span className="material-symbols-outlined text-base text-[#60a5fa]">forum</span>
              <span>Discord</span>
            </a>
          </div>

          {/* Audio Input Level Indicator */}
          <button
            onClick={onOpenAudioSettings}
            title="Audio Hardware & Calibration"
            className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 bg-[#1a2027] hover:bg-[#242a32] border border-[#2a3340] rounded-lg transition-colors cursor-pointer text-[#94a3b8] hover:text-[#dde3ed]"
          >
            <span className="material-symbols-outlined text-sm text-[#22c55e]">mic</span>
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-1 h-2"></span>
              <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-2 h-3"></span>
              <span className="w-1 bg-[#22c55e] rounded-full animate-audio-bar-3 h-1.5"></span>
              <span className="w-1 bg-[#2f353d] rounded-full h-1"></span>
            </div>
          </button>

          {/* User Profile Avatar */}
          <div className="relative flex items-center">
            <button
              onClick={onOpenProfile}
              className="relative p-0.5 rounded-full hover:ring-2 hover:ring-[#22c55e] transition-all cursor-pointer focus:outline-none"
              title="Alex Miller (Your Profile)"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Alex Miller profile"
                className="w-8 h-8 rounded-full object-cover border border-[#2a3340]"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#161c23]"></span>
            </button>
          </div>

          {/* General Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
            title="Settings"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
