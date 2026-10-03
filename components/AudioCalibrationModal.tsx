"use client";

import React, { useState, useEffect } from "react";

interface AudioCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioCalibrationModal({ isOpen, onClose }: AudioCalibrationModalProps) {
  const [micLevel, setMicLevel] = useState<number>(45);
  const [isTestingMic, setIsTestingMic] = useState<boolean>(true);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [echoCancellation, setEchoCancellation] = useState<boolean>(true);
  const [selectedMic, setSelectedMic] = useState<string>("AirPods Pro Microphone (Bluetooth)");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("AirPods Pro Audio Out");
  const [isPlayingTestChime, setIsPlayingTestChime] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !isTestingMic) return;
    const interval = setInterval(() => {
      // Simulate live fluctuating audio volume
      const base = 40 + Math.floor(Math.random() * 35);
      setMicLevel(base);
    }, 150);
    return () => clearInterval(interval);
  }, [isOpen, isTestingMic]);

  if (!isOpen) return null;

  const handleTestSpeaker = () => {
    setIsPlayingTestChime(true);
    // Play test audio beep via Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
            <span className="material-symbols-outlined text-[#22c55e] text-2xl">tune</span>
            <h3 className="font-bold text-base text-[#dde3ed]">Audio Hardware & Calibration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Live Mic Test Meter */}
        <div className="p-4 bg-[#1a2027] border border-[#2a3340] rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#dde3ed] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#22c55e]">mic</span>
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
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
            >
              <option value="AirPods Pro Microphone (Bluetooth)">AirPods Pro Microphone (Bluetooth)</option>
              <option value="Built-in Microphone (Realtek Audio)">Built-in Microphone (Realtek Audio)</option>
              <option value="USB Condenser Mic (Default)">USB Condenser Mic (Default)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#dde3ed] mb-1">
              Speaker Output Device
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
              >
                <option value="AirPods Pro Audio Out">AirPods Pro Audio Out</option>
                <option value="Internal Laptop Speakers">Internal Laptop Speakers</option>
                <option value="Headphones Jack">Headphones Jack (3.5mm)</option>
              </select>
              <button
                type="button"
                onClick={handleTestSpeaker}
                className="px-3 py-2 rounded-xl bg-[#242a32] hover:bg-[#2f353d] text-xs font-semibold text-[#dde3ed] border border-[#2a3340] shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm text-[#22c55e]">
                  {isPlayingTestChime ? "graphic_eq" : "volume_up"}
                </span>
                <span>Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audio Filters (Noise cancellation & Echo) */}
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#dde3ed]">AI Noise Suppression (RNNoise)</span>
              <span className="text-[11px] text-[#94a3b8]">Removes background fans, typing, and ambient room noise</span>
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
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#22c55e] text-[#003915] font-bold text-xs sm:text-sm hover:bg-[#4be277] transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Save & Finish Calibration
          </button>
        </div>
      </div>
    </div>
  );
}
