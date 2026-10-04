"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface MotionCardProps extends HTMLMotionProps<"div"> {
  enableHoverEffect?: boolean;
  glowOnHover?: boolean;
  children: React.ReactNode;
}

export function MotionCard({
  enableHoverEffect = true,
  glowOnHover = true,
  className = "",
  children,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      layout="position"
      whileHover={
        enableHoverEffect
          ? {
              y: -4,
              transition: { type: "spring", stiffness: 400, damping: 25 },
            }
          : undefined
      }
      className={`group relative bg-[#161c23] border border-[#2a3340]/70 rounded-2xl p-5 transition-colors shadow-md ${
        glowOnHover
          ? "hover:border-[#22c55e]/50 hover:shadow-[0_10px_35px_rgba(0,0,0,0.55)]"
          : "hover:border-[#2a3340]"
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
