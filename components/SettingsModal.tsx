"use client";

import React from "react";
import { useSettingsStore, useUIStore } from "@/stores";
import { VoiceMode, AudioQuality } from "@/enums";
import { Settings, CheckCircle2, Mic } from "lucide-react";
import { MotionButton } from "./motion/MotionButton";
import { MotionModal } from "./motion/MotionModal";

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

  return (
    <MotionModal
      isOpen={isSettingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Preferences & Settings"
      icon={<Settings className="w-4 h-4" />}
      maxWidth="max-w-md sm:max-w-lg"
      bodyClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-4">
        {/* Voice Input Activation */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#dde3ed] uppercase tracking-wider">
            Voice Input Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setVoiceMode(VoiceMode.VAD)}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[48px] ${
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
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[48px] ${
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
            className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e] min-h-[40px] truncate"
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
        <div className="space-y-2.5">
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer hover:border-[#2a3340]/90 transition-colors min-h-[48px]">
            <span className="text-xs font-semibold text-[#dde3ed] pr-2">
              Play subtle chime when learner joins/leaves
            </span>
            <input
              type="checkbox"
              checked={joinLeaveSounds}
              onChange={(e) => setJoinLeaveSounds(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer hover:border-[#2a3340]/90 transition-colors min-h-[48px]">
            <span className="text-xs font-semibold text-[#dde3ed] pr-2">
              Allow direct backchannel study invites
            </span>
            <input
              type="checkbox"
              checked={directInvites}
              onChange={(e) => setDirectInvites(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded cursor-pointer shrink-0"
            />
          </label>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#2a3340] shrink-0 mt-3">
        <button
          onClick={() => {
            setSettingsOpen(false);
            setCalibrationOpen(true);
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e] hover:text-[#4be277] cursor-pointer min-h-[36px]"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Open Hardware Test</span>
        </button>
        <MotionButton
          variant="primary"
          size="md"
          onClick={() => setSettingsOpen(false)}
        >
          Save Changes
        </MotionButton>
      </div>
    </MotionModal>
  );
}
