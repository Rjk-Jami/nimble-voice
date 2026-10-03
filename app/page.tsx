"use client";

import React, { useState } from "react";
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
import { INITIAL_ROOMS, VoiceRoom } from "@/lib/data";

export default function Home() {
  const [rooms, setRooms] = useState<VoiceRoom[]>(INITIAL_ROOMS);
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [activeTab, setActiveTab] = useState<string>("rooms");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createInitialTopic, setCreateInitialTopic] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Join Room handler
  const handleJoinRoom = (room: VoiceRoom) => {
    setActiveRoom(room);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Leave Room handler
  const handleLeaveRoom = () => {
    setActiveRoom(null);
  };

  // Create Room handler
  const handleCreateRoom = (newRoom: VoiceRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    setActiveRoom(newRoom);
    setActiveTab("rooms");
  };

  // Start room from Topic Starter
  const handleSelectTopicFromPrompts = (topicTitle: string) => {
    setCreateInitialTopic(topicTitle);
    setIsCreateOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0e141b] text-[#dde3ed] flex flex-col font-sans">
      {/* Fixed Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (activeRoom && tab !== "rooms") {
            // keep room running in background or let user browse
          }
        }}
        onOpenCreateModal={() => {
          setCreateInitialTopic("");
          setIsCreateOpen(true);
        }}
        onOpenAudioSettings={() => setIsCalibrationOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        inCall={activeRoom !== null}
      />

      {/* Main Content Area */}
      <main className="w-full pt-16 flex-1 flex flex-col">
        {activeRoom ? (
          <div className="flex flex-col animate-fade-in">
            {/* If in call, show persistent mini banner to return to lobby browsing if needed */}
            <div className="w-full bg-[#161c23] border-b border-[#2a3340]/60 px-6 py-2 flex items-center justify-between text-xs text-[#94a3b8]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping"></span>
                <span className="font-semibold text-[#dde3ed]">Active In-Room Session</span>
                <span>•</span>
                <span>{activeRoom.title}</span>
              </div>
              <button
                onClick={handleLeaveRoom}
                className="text-[#ef4444] hover:underline font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">exit_to_app</span>
                Leave call & return to directory
              </button>
            </div>

            <LiveVoiceRoom
              room={activeRoom}
              onLeaveRoom={handleLeaveRoom}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        ) : (
          <>
            {activeTab === "rooms" && (
              <LobbyView
                rooms={rooms}
                onJoinRoom={handleJoinRoom}
                onOpenCreateModal={() => {
                  setCreateInitialTopic("");
                  setIsCreateOpen(true);
                }}
                onPreviewCall={(room) => handleJoinRoom(room)}
              />
            )}

            {activeTab === "topics" && (
              <TopicsView onSelectTopic={handleSelectTopicFromPrompts} />
            )}

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
              onClick={() => setIsCalibrationOpen(true)}
              className="hover:text-[#dde3ed] transition-colors"
            >
              Audio Calibration
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className="hover:text-[#dde3ed] transition-colors"
            >
              Safety Rules
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className="hover:text-[#dde3ed] transition-colors"
            >
              Server Status
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateRoom={handleCreateRoom}
        initialTopic={createInitialTopic}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
      />

      <AudioCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
      />
    </div>
  );
}
