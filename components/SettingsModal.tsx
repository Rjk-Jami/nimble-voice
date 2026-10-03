"use client";

import React, { useState } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCalibration: () => void;
}

export function SettingsModal({ isOpen, onClose, onOpenCalibration }: SettingsModalProps) {
  const [audioMode, setAudioMode] = useState<string>("vad");
  const [bitrate, setBitrate] = useState<string>("opus-64");
  const [joinChime, setJoinChime] = useState<boolean>(true);
  const [directMessages, setDirectMessages] = useState<boolean>(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161c23] border border-[#2a3340] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3340]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#22c55e] text-2xl">settings</span>
            <h3 className="font-bold text-base text-[#dde3ed]">Preferences & Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Voice Input Activation */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#dde3ed] uppercase tracking-wider">
            Voice Input Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAudioMode("vad")}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                audioMode === "vad"
                  ? "bg-[#22c55e]/15 border-[#22c55e] text-[#dde3ed]"
                  : "bg-[#1a2027] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Voice Activity (VAD)</span>
                {audioMode === "vad" && (
                  <span className="material-symbols-outlined text-sm text-[#22c55e]">check_circle</span>
                )}
              </div>
              <span className="text-[10px] text-[#94a3b8]">Auto-transmits when you speak</span>
            </button>

            <button
              onClick={() => setAudioMode("ptt")}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                audioMode === "ptt"
                  ? "bg-[#22c55e]/15 border-[#22c55e] text-[#dde3ed]"
                  : "bg-[#1a2027] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Push-to-Talk (Space)</span>
                {audioMode === "ptt" && (
                  <span className="material-symbols-outlined text-sm text-[#22c55e]">check_circle</span>
                )}
              </div>
              <span className="text-[10px] text-[#94a3b8]">Hold Spacebar to speak</span>
            </button>
          </div>
        </div>

        {/* Audio Codec & Fidelity */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#dde3ed] uppercase tracking-wider">
            Opus Audio Fidelity
          </label>
          <select
            value={bitrate}
            onChange={(e) => setBitrate(e.target.value)}
            className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
          >
            <option value="opus-64">High Fidelity (64 kbps, 48kHz Stereo) — Recommended</option>
            <option value="opus-32">Data Saver (32 kbps Mono) — Low Bandwidth</option>
            <option value="opus-96">Studio Broadcast (96 kbps Stereo)</option>
          </select>
        </div>

        {/* Notification Chimes */}
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer">
            <span className="text-xs font-semibold text-[#dde3ed]">Play subtle chime when learner joins/leaves</span>
            <input
              type="checkbox"
              checked={joinChime}
              onChange={(e) => setJoinChime(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer">
            <span className="text-xs font-semibold text-[#dde3ed]">Allow direct backchannel study invites</span>
            <input
              type="checkbox"
              checked={directMessages}
              onChange={(e) => setDirectMessages(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#2a3340]">
          <button
            onClick={() => {
              onClose();
              onOpenCalibration();
            }}
            className="text-xs font-semibold text-[#22c55e] hover:text-[#4be277]"
          >
            Open Hardware Test
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#22c55e] text-[#003915] font-bold text-xs sm:text-sm hover:bg-[#4be277] transition-all shadow-md active:scale-95"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
