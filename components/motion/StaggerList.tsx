"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function StaggerContainer({
  children,
  className = "",
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function StaggerItem({
  children,
  className = "",
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      layout="position"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
