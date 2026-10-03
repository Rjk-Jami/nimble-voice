"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { LobbyView } from "@/components/LobbyView";
import { LiveVoiceRoom } from "@/components/LiveVoiceRoom";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { TopicsView } from "@/components/TopicsView";
import { CommunityView } from "@/components/CommunityView";
import { AboutView } from "@/components/AboutView";
import { ProfileModal } from "@/components/ProfileModal";
import { AudioCalibrationModal } from "@/components/AudioCalibrationModal";
import { SettingsModal } from "@/components/SettingsModal";
import { useRoomStore, useUIStore } from "@/stores";
import { PhoneOff } from "lucide-react";

export default function Home() {
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  const { activeTab, setActiveTab, setCalibrationOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-[#0e141b] text-[#dde3ed] flex flex-col font-sans">
      {/* Fixed Header Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="w-full pt-16 flex-1 flex flex-col">
        {currentRoom ? (
          <div className="flex flex-col animate-fade-in">
            {/* Active Session Ribbon */}
            <div className="w-full bg-[#161c23] border-b border-[#2a3340]/60 px-6 py-2 flex items-center justify-between text-xs text-[#94a3b8]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping"></span>
                <span className="font-semibold text-[#dde3ed]">Active In-Room Session</span>
                <span>•</span>
                <span>{currentRoom.title}</span>
              </div>
              <button
                onClick={leaveRoom}
                className="text-[#ef4444] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Leave call & return to directory</span>
              </button>
            </div>

            <LiveVoiceRoom room={currentRoom} />
          </div>
        ) : (
          <>
            {activeTab === "rooms" && <LobbyView />}
            {activeTab === "topics" && <TopicsView />}
            {activeTab === "community" && <CommunityView />}
            {activeTab === "about" && <AboutView />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#2a3340]/60 bg-[#12181f] py-6 px-6 mt-auto text-xs text-[#94a3b8]">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#dde3ed]">NimbleVoice</span>
            <span>—</span>
            <span>Free4Talk Clone Platform for Real-Time Multilingual Voice Exchange</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setCalibrationOpen(true)}
              className="hover:text-[#dde3ed] transition-colors cursor-pointer"
            >
              Audio Calibration
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className="hover:text-[#dde3ed] transition-colors cursor-pointer"
            >
              Safety Rules
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className="hover:text-[#dde3ed] transition-colors cursor-pointer"
            >
              Server Status
            </button>
          </div>
        </div>
      </footer>

      {/* Modals driven by separated Zustand Stores */}
      <CreateRoomModal />
      <ProfileModal />
      <AudioCalibrationModal />
      <SettingsModal />
    </div>
  );
}
