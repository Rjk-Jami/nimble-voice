"use client";

import React from "react";
import { useSettingsStore, useUIStore } from "@/stores";
import { VoiceMode, AudioQuality } from "@/enums";
import { Settings, X, CheckCircle2, Mic } from "lucide-react";

export function SettingsModal() {
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setCalibrationOpen = useUIStore((s) => s.setCalibrationOpen);

  const {
    voiceMode,
    audioQuality,
    joinLeaveSounds,
    directInvites,
    setVoiceMode,
    setAudioQuality,
    setJoinLeaveSounds,
    setDirectInvites,
  } = useSettingsStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161c23] border border-[#2a3340] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3340]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center border border-[#22c55e]/40">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Preferences & Settings</h3>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Input Activation */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#dde3ed] uppercase tracking-wider">
            Voice Input Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVoiceMode(VoiceMode.VAD)}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                voiceMode === VoiceMode.VAD
                  ? "bg-[#22c55e]/15 border-[#22c55e] text-[#dde3ed]"
                  : "bg-[#1a2027] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Voice Activity (VAD)</span>
                {voiceMode === VoiceMode.VAD && (
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                )}
              </div>
              <span className="text-[10px] text-[#94a3b8]">Auto-transmits when speaking</span>
            </button>

            <button
              onClick={() => setVoiceMode(VoiceMode.PUSH_TO_TALK)}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                voiceMode === VoiceMode.PUSH_TO_TALK
                  ? "bg-[#22c55e]/15 border-[#22c55e] text-[#dde3ed]"
                  : "bg-[#1a2027] border-[#2a3340] text-[#94a3b8] hover:text-[#dde3ed]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Push-to-Talk (Space)</span>
                {voiceMode === VoiceMode.PUSH_TO_TALK && (
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
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
            value={audioQuality}
            onChange={(e) => setAudioQuality(e.target.value as AudioQuality)}
            className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
          >
            <option value={AudioQuality.HIGH_FIDELITY}>
              High Fidelity (64 kbps, 48kHz Stereo) — Recommended
            </option>
            <option value={AudioQuality.DATA_SAVER}>
              Data Saver (32 kbps Mono) — Low Bandwidth
            </option>
            <option value={AudioQuality.STUDIO}>
              Studio Broadcast (96 kbps Stereo)
            </option>
          </select>
        </div>

        {/* Notification Chimes */}
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer">
            <span className="text-xs font-semibold text-[#dde3ed]">
              Play subtle chime when learner joins/leaves
            </span>
            <input
              type="checkbox"
              checked={joinLeaveSounds}
              onChange={(e) => setJoinLeaveSounds(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer">
            <span className="text-xs font-semibold text-[#dde3ed]">
              Allow direct backchannel study invites
            </span>
            <input
              type="checkbox"
              checked={directInvites}
              onChange={(e) => setDirectInvites(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#2a3340]">
          <button
            onClick={() => {
              setSettingsOpen(false);
              setCalibrationOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e] hover:text-[#4be277] cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Open Hardware Test</span>
          </button>
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-5 py-2 rounded-xl bg-[#22c55e] text-[#003915] font-bold text-xs sm:text-sm hover:bg-[#4be277] transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
