"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useVoiceStore } from "@/stores";

interface UseSpeakingDetectionOptions {
  threshold?: number; // volume threshold (0-100)
  fftSize?: number;
  intervalMs?: number;
  onVolumeChange?: (volume: number) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export function useSpeakingDetection(
  stream: MediaStream | null,
  options: UseSpeakingDetectionOptions = {}
) {
  const {
    threshold = 15,
    fftSize = 256,
    intervalMs = 100,
    onVolumeChange,
    onSpeakingChange,
  } = options;

  const [volume, setVolume] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isMuted = useVoiceStore((s) => s.isMuted);

  const cleanupAudio = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (analyserRef.current) analyserRef.current.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    setVolume(0);
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (!stream || isMuted) {
      cleanupAudio();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0.5;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalizedVolume = Math.min(100, Math.round((avg / 128) * 100));

        setVolume(normalizedVolume);
        onVolumeChange?.(normalizedVolume);

        const speakingNow = normalizedVolume > threshold;
        setIsSpeaking(speakingNow);
        onSpeakingChange?.(speakingNow);
      }, intervalMs);
    } catch {
      // AudioContext fallback
    }

    return cleanupAudio;
  }, [stream, isMuted, threshold, fftSize, intervalMs, cleanupAudio, onVolumeChange, onSpeakingChange]);

  return {
    volume,
    isSpeaking,
  };
}
