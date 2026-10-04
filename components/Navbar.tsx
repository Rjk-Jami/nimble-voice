"use client";

import React, { useEffect } from "react";
import { useUIStore, useRoomStore, useAuthStore, useVoiceStore } from "@/stores";
import { Plus, Coffee, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { TabGlider } from "./motion/TabGlider";
import { TacticalEqualizer } from "./motion/TacticalEqualizer";

const NAV_TABS = [
  { id: "rooms", label: "Rooms" },
  { id: "topics", label: "Topics & Starters" },
  { id: "community", label: "Community & Safety" },
  { id: "about", label: "About" },
] as const;

export function Navbar() {
  const {
    activeTab,
    setActiveTab,
    openCreateModal,
    setCalibrationOpen,
    setSettingsOpen,
    setProfileOpen,
  } = useUIStore();

  const user = useAuthStore((s) => s.user);
  const initUser = useAuthStore((s) => s.initUser);
  const isMuted = useVoiceStore((s) => s.isMuted);
  const isSpeaking = useVoiceStore((s) => (user?.id ? !!s.speakingMap[user.id] : false));

  // Initialize client-side user from localStorage after initial hydration
  useEffect(() => {
    initUser();
  }, [initUser]);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#161c23]/95 backdrop-blur-md border-b border-[#2a3340]/60 shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
      <div className="h-16 w-full px-4 sm:px-6 flex items-center justify-between gap-3 max-w-[1680px] mx-auto">
        {/* Brand & Main Links */}
        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("rooms")}
            className="flex items-center gap-2.5 shrink-0 focus:outline-none group text-left cursor-pointer"
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
          </motion.button>

          <nav className="hidden md:flex items-center gap-1 relative">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer select-none ${isActive ? "text-[#22c55e]" : "text-[#94a3b8] hover:text-[#dde3ed]"
                    }`}
                >
                  {isActive && (
                    <TabGlider
                      layoutId="navbar-active-tab"
                      className="absolute inset-0 bg-[#242a32] rounded-xl -z-10 shadow-sm border border-[#2a3340]"
                    />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Action Controls & User Tray */}
        <div className="flex items-center gap-3">
          {/* Quick Create Group Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 20 }}
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 bg-[#22c55e] text-[#003915] px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm hover:bg-[#4be277] transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create a new group</span>
            <span className="sm:hidden">Create</span>
          </motion.button>

          {/* Social / Coffee Links */}
          <div className="hidden lg:flex items-center gap-1 text-[#94a3b8] border-l border-[#2a3340] pl-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() =>
                alert("Coffee Support: Thank you for keeping NimbleVoice servers running free for learners worldwide!")
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5 text-[#eab308]" />
              <span>Buy me a coffee</span>
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
            >
              <span className="material-symbols-outlined text-base text-[#60a5fa]">forum</span>
              <span>Discord</span>
            </motion.a>
          </div>

          {/* Audio Input Level Indicator */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setCalibrationOpen(true)}
            title="Audio Hardware & Calibration"
            className="hidden sm:flex items-center gap-2 h-8 px-2.5 bg-[#1a2027] hover:bg-[#242a32] border border-[#2a3340] rounded-lg transition-colors cursor-pointer text-[#94a3b8] hover:text-[#dde3ed]"
          >
            <span className="material-symbols-outlined text-sm text-[#22c55e]">mic</span>
            <TacticalEqualizer isActive={!isMuted && isSpeaking} barCount={4} size="sm" />
          </motion.button>

          {/* User Profile Avatar */}
          <div className="relative flex items-center">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setProfileOpen(true)}
              className="relative p-0.5 rounded-full hover:ring-2 hover:ring-[#22c55e] transition-all cursor-pointer focus:outline-none"
              title={`${user?.name || "Profile"} (Your Account)`}
              suppressHydrationWarning
            >
              <img
                src={
                  user?.avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                }
                alt="Profile avatar"
                className="w-8 h-8 rounded-full object-cover border border-[#2a3340]"
                suppressHydrationWarning
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#161c23]"></span>
            </motion.button>
          </div>

          {/* General Settings Button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
