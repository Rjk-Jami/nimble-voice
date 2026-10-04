"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface FloatingReactionItem {
  id: string;
  emoji: string;
  xOffset?: number;
}

interface FloatingReactionsProps {
  reactions: FloatingReactionItem[];
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 0, scale: 0.5, x: r.xOffset || 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -120,
              scale: [0.5, 1.3, 1.1, 0.9],
              x: (r.xOffset || 0) + (Math.random() * 30 - 15),
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.2,
              ease: "easeOut",
            }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 text-3xl select-none filter drop-shadow-md"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
