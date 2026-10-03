"use client";

import React, { useState, useEffect } from "react";
import { useDevices } from "@/hooks";
import { useSettingsStore, useUIStore } from "@/stores";
import { Sliders, Volume2, Mic, X, CheckCircle2 } from "lucide-react";

export function AudioCalibrationModal() {
  const isCalibrationOpen = useUIStore((s) => s.isCalibrationOpen);
  const setCalibrationOpen = useUIStore((s) => s.setCalibrationOpen);

  const {
    audioInputId,
    audioOutputId,
    microphones,
    speakers,
    setAudioInputId,
    setAudioOutputId,
  } = useDevices();

  const {
    noiseSuppression,
    echoCancellation,
    setNoiseSuppression,
    setEchoCancellation,
  } = useSettingsStore();

  const [micLevel, setMicLevel] = useState<number>(45);
  const [isPlayingTestChime, setIsPlayingTestChime] = useState<boolean>(false);

  useEffect(() => {
    if (!isCalibrationOpen) return;
    const interval = setInterval(() => {
      // simulate realistic fluctuation
      const base = 35 + Math.floor(Math.random() * 40);
      setMicLevel(base);
    }, 120);
    return () => clearInterval(interval);
  }, [isCalibrationOpen]);

  if (!isCalibrationOpen) return null;

  const handleTestSpeaker = () => {
    setIsPlayingTestChime(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // AudioContext fallback
    }
    setTimeout(() => setIsPlayingTestChime(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161c23] border border-[#2a3340] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3340]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center border border-[#22c55e]/40">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Audio Hardware & Calibration</h3>
          </div>
          <button
            onClick={() => setCalibrationOpen(false)}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Mic Test Meter */}
        <div className="p-4 bg-[#1a2027] border border-[#2a3340] rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#dde3ed] flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-[#22c55e]" />
              Microphone Sensitivity & Volume
            </span>
            <span className="text-xs font-bold text-[#22c55e] font-mono">{micLevel}%</span>
          </div>

          {/* Level Meter Bars */}
          <div className="w-full h-3 bg-[#090f15] rounded-full overflow-hidden p-0.5 border border-[#2a3340]">
            <div
              className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-[#22c55e] via-[#4be277] to-[#eab308]"
              style={{ width: `${micLevel}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Speak naturally. If the bar remains in green, your voice is clean and intelligible for other learners.
          </p>
        </div>

        {/* Hardware Devices Selector */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#dde3ed] mb-1">
              Microphone Input Device
            </label>
            <select
              value={audioInputId}
              onChange={(e) => setAudioInputId(e.target.value)}
              className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
            >
              {microphones.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#dde3ed] mb-1">
              Speaker Output Device
            </label>
            <div className="flex items-center gap-2">
              <select
                value={audioOutputId}
                onChange={(e) => setAudioOutputId(e.target.value)}
                className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
              >
                {speakers.map((s) => (
                  <option key={s.deviceId} value={s.deviceId}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleTestSpeaker}
                className="px-3 py-2 rounded-xl bg-[#242a32] hover:bg-[#2f353d] text-xs font-semibold text-[#dde3ed] border border-[#2a3340] shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>{isPlayingTestChime ? "Playing..." : "Test"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audio Filters (Noise cancellation & Echo) */}
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#dde3ed]">AI Noise Suppression (RNNoise)</span>
              <span className="text-[11px] text-[#94a3b8]">Removes background fans, typing, and ambient noise</span>
            </div>
            <input
              type="checkbox"
              checked={noiseSuppression}
              onChange={(e) => setNoiseSuppression(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#dde3ed]">Acoustic Echo Cancellation</span>
              <span className="text-[11px] text-[#94a3b8]">Prevents feedback loops when speakers are nearby</span>
            </div>
            <input
              type="checkbox"
              checked={echoCancellation}
              onChange={(e) => setEchoCancellation(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a3340]">
          <button
            onClick={() => setCalibrationOpen(false)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#22c55e] text-[#003915] font-bold text-xs sm:text-sm hover:bg-[#4be277] transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save & Finish Calibration</span>
          </button>
        </div>
      </div>
    </div>
  );
}
