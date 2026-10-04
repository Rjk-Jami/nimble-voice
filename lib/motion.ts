import { type Variants, type Transition } from "framer-motion";

/**
 * Standard spring transitions for realistic, tactile UI feel
 */
export const tactileSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const snappySpring: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

export const bounceSpring: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 15,
};

/**
 * Fade and Slide entrance variants
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: gentleSpring,
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: tactileSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

/**
 * Staggered container for lists, grids, and feeds
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 25,
    },
  },
};

/**
 * Modal dialog variants (backdrop and modal dialog window)
 */
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18 },
  },
};

export const modalDialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Tactical audio pulse variants
 */
export const voicePulseRing: Variants = {
  initial: { scale: 0.85, opacity: 0.8 },
  animate: {
    scale: [0.95, 1.45, 1.6],
    opacity: [0.7, 0.25, 0],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: "easeOut",
    },
  },
};
