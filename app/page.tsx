"use client";

import { AboutView } from "@/components/AboutView";
import { AudioCalibrationModal } from "@/components/AudioCalibrationModal";
import { CommunityView } from "@/components/CommunityView";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { LiveVoiceRoom } from "@/components/LiveVoiceRoom";
import { LobbyView } from "@/components/LobbyView";
import { PageTransition } from "@/components/motion/PageTransition";
import { Navbar } from "@/components/Navbar";
import { ProfileModal } from "@/components/ProfileModal";
import { AuthModal } from "@/components/AuthModal";
import { SettingsModal } from "@/components/SettingsModal";
import { TopicsView } from "@/components/TopicsView";

import { useRoomStore, useUIStore } from "@/stores";
import { AnimatePresence, motion } from "framer-motion";
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
        <AnimatePresence mode="wait">
          {currentRoom ? (
            <PageTransition key={`room-${currentRoom.id}`} className="flex flex-col">


              <LiveVoiceRoom room={currentRoom} />
            </PageTransition>
          ) : (
            <PageTransition key={activeTab}>
              {activeTab === "rooms" && <LobbyView />}
              {activeTab === "topics" && <TopicsView />}
              {activeTab === "community" && <CommunityView />}
              {activeTab === "about" && <AboutView />}
            </PageTransition>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#2a3340]/60 bg-[#12181f] py-6 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-[#94a3b8]">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#dde3ed]">NimbleVoice</span>
            <span>—</span>
            <span>Real-Time Virtual Study & Voice Rooms</span>
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

      {/* Modals driven by separated Zustand Stores & Framer Motion AnimatePresence */}
      <CreateRoomModal />
      <ProfileModal />
      <AuthModal />
      <AudioCalibrationModal />
      <SettingsModal />
    </div>
  );
}

