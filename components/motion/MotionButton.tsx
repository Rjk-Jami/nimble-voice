"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";

interface MotionButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "icon";
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#22c55e] text-[#003915] font-bold hover:bg-[#4be277] shadow-[0_0_14px_rgba(34,197,94,0.3)] border border-[#22c55e]/50",
  secondary:
    "bg-[#242a32] hover:bg-[#2f353d] text-[#dde3ed] font-medium border border-[#2a3340]",
  danger:
    "bg-[#ef4444] text-white font-bold hover:bg-red-600 shadow-[0_0_14px_rgba(239,68,68,0.25)] border border-[#ef4444]/40",
  ghost:
    "bg-transparent text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32]/60",
  outline:
    "bg-transparent text-[#dde3ed] border border-[#2a3340] hover:border-[#22c55e]/50 hover:bg-[#242a32]/40",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-5 py-3 text-base rounded-2xl gap-2.5",
  icon: "p-2 rounded-xl",
};

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={{
          type: "spring",
          stiffness: 450,
          damping: 25,
        }}
        disabled={disabled}
        className={`inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MotionButton.displayName = "MotionButton";
