"use client";

import React from "react";
import { motion } from "framer-motion";

interface TacticalEqualizerProps {
  isActive?: boolean;
  barCount?: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BAR_PATTERNS = [
  { heights: [4, 14, 6, 18, 5], duration: 0.65 },
  { heights: [5, 20, 10, 24, 7], duration: 0.55 },
  { heights: [3, 16, 8, 14, 4], duration: 0.75 },
  { heights: [6, 22, 12, 16, 5], duration: 0.6 },
  { heights: [4, 18, 7, 20, 6], duration: 0.7 },
];

export function TacticalEqualizer({
  isActive = true,
  barCount = 4,
  color = "#22c55e",
  size = "md",
  className = "",
}: TacticalEqualizerProps) {
  const heightMultiplier = size === "sm" ? 0.7 : size === "lg" ? 1.3 : 1;
  const barWidth = size === "sm" ? "w-0.5" : size === "lg" ? "w-1.5" : "w-1";
  const containerHeight = size === "sm" ? "h-3.5" : size === "lg" ? "h-6" : "h-4.5";

  return (
    <div
      className={`flex items-end gap-1 ${containerHeight} px-1.5 py-0.5 rounded bg-[#242a32]/80 backdrop-blur-xs ${className}`}
      aria-label="Audio equalizer"
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const pattern = BAR_PATTERNS[i % BAR_PATTERNS.length];
        const scaledHeights = pattern.heights.map((h) => Math.max(3, Math.round(h * heightMultiplier)));

        return (
          <motion.span
            key={i}
            className={`${barWidth} rounded-full`}
            style={{ backgroundColor: color }}
            initial={{ height: 3 }}
            animate={
              isActive
                ? {
                    height: scaledHeights,
                    transition: {
                      repeat: Infinity,
                      repeatType: "mirror",
                      duration: pattern.duration,
                      ease: "easeInOut",
                      delay: i * 0.12,
                    },
                  }
                : {
                    height: 3,
                    transition: { duration: 0.25 },
                  }
            }
          />
        );
      })}
    </div>
  );
}
