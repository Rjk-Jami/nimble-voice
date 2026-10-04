"use client";

import React from "react";
import { motion } from "framer-motion";

interface SpeakingRippleProps {
  color?: string; // default emerald green: #22c55e
  size?: number; // size of parent avatar in px, default 40
  isActive?: boolean;
}

export function SpeakingRipple({
  color = "#22c55e",
  size = 40,
  isActive = true,
}: SpeakingRippleProps) {
  if (!isActive) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10"
      aria-hidden="true"
    >
      {/* Wave Ring 1 */}
      <motion.span
        initial={{ scale: 0.9, opacity: 0.8 }}
        animate={{
          scale: [0.95, 1.35, 1.5],
          opacity: [0.75, 0.3, 0],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0,
        }}
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          border: `2px solid ${color}`,
          backgroundColor: `${color}15`,
        }}
      />

      {/* Wave Ring 2 */}
      <motion.span
        initial={{ scale: 0.9, opacity: 0.8 }}
        animate={{
          scale: [0.95, 1.45, 1.7],
          opacity: [0.7, 0.25, 0],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0.6,
        }}
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          border: `1.5px solid ${color}`,
        }}
      />
    </div>
  );
}
