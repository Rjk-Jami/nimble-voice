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
              {/* Active Session Ribbon */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full bg-[#161c23] border-b border-[#2a3340]/60 px-6 py-2 flex items-center justify-between text-xs text-[#94a3b8]"
              >
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
              </motion.div>

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

      {/* Modals driven by separated Zustand Stores & Framer Motion AnimatePresence */}
      <CreateRoomModal />
      <ProfileModal />
      <AudioCalibrationModal />
      <SettingsModal />
    </div>
  );
}
