"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { modalBackdropVariants, modalDialogVariants } from "@/lib/motion";
import { X } from "lucide-react";

interface MotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string; // e.g. "max-w-lg", "max-w-xl", "max-w-2xl"
  className?: string;
  closeOnBackdropClick?: boolean;
}

export function MotionModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = "max-w-lg",
  className = "",
  closeOnBackdropClick = true,
}: MotionModalProps) {
  // Listen for ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            variants={modalDialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-full ${maxWidth} bg-[#161c23] border border-[#2a3340] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 ${className}`}
          >
            {/* Optional integrated header if title provided */}
            {title && (
              <div className="flex items-center justify-between pb-3 border-b border-[#2a3340]">
                <div className="flex items-center gap-2.5">
                  {icon && (
                    <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center border border-[#22c55e]/40 shrink-0">
                      {icon}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base text-[#dde3ed]">{title}</h3>
                    {subtitle && <p className="text-xs text-[#94a3b8]">{subtitle}</p>}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "#242a32" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
