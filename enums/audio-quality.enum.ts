export enum AudioQuality {
  DATA_SAVER = "opus-32",
  HIGH_FIDELITY = "opus-64",
  STUDIO = "opus-96",
}

export const AUDIO_QUALITY_LABELS: Record<AudioQuality, string> = {
  [AudioQuality.DATA_SAVER]: "Data Saver (32 kbps Mono) — Low Bandwidth",
  [AudioQuality.HIGH_FIDELITY]: "High Fidelity (64 kbps Stereo) — Recommended",
  [AudioQuality.STUDIO]: "Studio Broadcast (96 kbps Stereo)",
};
