"use client";

import React, { useState, useEffect } from "react";
import { useDevices } from "@/hooks";
import { useSettingsStore, useUIStore } from "@/stores";
import { Sliders, Volume2, Mic, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { MotionModal } from "./motion/MotionModal";
import { TacticalEqualizer } from "./motion/TacticalEqualizer";
import { MotionButton } from "./motion/MotionButton";

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

  const [micLevel, setMicLevel] = useState<number>(0);
  const [isPlayingTestChime, setIsPlayingTestChime] = useState<boolean>(false);

  // Real-time microphone audio level analyzer
  useEffect(() => {
    if (!isCalibrationOpen) {
      setMicLevel(0);
      return;
    }

    let mounted = true;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let timer: NodeJS.Timeout | null = null;

    const setupMic = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: audioInputId ? { exact: audioInputId } : undefined,
            noiseSuppression,
            echoCancellation,
          },
        });

        if (!mounted) return;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        audioCtx = new AudioCtx();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        timer = setInterval(() => {
          if (!analyser || !mounted) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          setMicLevel(level);
        }, 80);
      } catch (err) {
        if (mounted) setMicLevel(0);
      }
    };

    setupMic();

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(() => {});
    };
  }, [isCalibrationOpen, audioInputId, noiseSuppression, echoCancellation]);

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
    <MotionModal
      isOpen={isCalibrationOpen}
      onClose={() => setCalibrationOpen(false)}
      title="Audio Hardware & Calibration"
      icon={<Sliders className="w-4 h-4" />}
      maxWidth="max-w-lg"
    >
      {/* Live Mic Test Meter */}
      <div className="p-4 bg-[#1a2027] border border-[#2a3340] rounded-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#dde3ed] flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-[#22c55e]" />
            Microphone Sensitivity & Volume
          </span>
          <div className="flex items-center gap-2">
            <TacticalEqualizer isActive={true} barCount={4} size="sm" />
            <span className="text-xs font-bold text-[#22c55e] font-mono">{micLevel}%</span>
          </div>
        </div>

        {/* Dynamic Spring Level Meter Bar */}
        <div className="w-full h-3 bg-[#090f15] rounded-full overflow-hidden p-0.5 border border-[#2a3340]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#22c55e] via-[#4be277] to-[#eab308]"
            initial={{ width: "30%" }}
            animate={{ width: `${micLevel}%` }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
          />
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
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleTestSpeaker}
              className="px-3 py-2 rounded-xl bg-[#242a32] hover:bg-[#2f353d] text-xs font-semibold text-[#dde3ed] border border-[#2a3340] shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#22c55e]" />
              <span>{isPlayingTestChime ? "Playing..." : "Test"}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Audio Filters (Noise cancellation & Echo) */}
      <div className="space-y-2">
        <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer hover:border-[#2a3340]/90 transition-colors">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#dde3ed]">AI Noise Suppression (RNNoise)</span>
            <span className="text-[11px] text-[#94a3b8]">Removes background fans, typing, and ambient noise</span>
          </div>
          <input
            type="checkbox"
            checked={noiseSuppression}
            onChange={(e) => setNoiseSuppression(e.target.checked)}
            className="accent-[#22c55e] w-4 h-4 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer hover:border-[#2a3340]/90 transition-colors">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#dde3ed]">Acoustic Echo Cancellation</span>
            <span className="text-[11px] text-[#94a3b8]">Prevents feedback loops when speakers are nearby</span>
          </div>
          <input
            type="checkbox"
            checked={echoCancellation}
            onChange={(e) => setEchoCancellation(e.target.checked)}
            className="accent-[#22c55e] w-4 h-4 rounded cursor-pointer"
          />
        </label>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a3340]">
        <MotionButton
          variant="primary"
          size="md"
          onClick={() => setCalibrationOpen(false)}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save & Finish Calibration</span>
        </MotionButton>
      </div>
    </MotionModal>
  );
}
