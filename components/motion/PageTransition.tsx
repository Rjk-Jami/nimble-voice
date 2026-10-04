"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { slideUp } from "@/lib/motion";

interface PageTransitionProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function PageTransition({
  children,
  className = "w-full",
  ...props
}: PageTransitionProps) {
  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
