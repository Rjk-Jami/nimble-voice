"use client";

import React from "react";
import { motion } from "framer-motion";

interface TabGliderProps {
  layoutId: string;
  className?: string;
}

export function TabGlider({
  layoutId,
  className = "absolute inset-0 bg-[#242a32] rounded-xl -z-10 shadow-sm border border-[#2a3340]",
}: TabGliderProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className={className}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 32,
      }}
    />
  );
}
