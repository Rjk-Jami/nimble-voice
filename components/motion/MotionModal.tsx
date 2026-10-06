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
  bodyClassName?: string;
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
  bodyClassName = "",
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
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
            className={`relative z-10 w-[95vw] ${maxWidth} max-h-[88vh] bg-[#161c23] border border-[#2a3340] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden ${className}`}
          >
            {/* Optional integrated header if title provided */}
            {title && (
              <div className="flex items-center justify-between pb-3 border-b border-[#2a3340] shrink-0 mb-3 sm:mb-4">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {icon && (
                    <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center border border-[#22c55e]/40 shrink-0">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-[#dde3ed] truncate">{title}</h3>
                    {subtitle && <p className="text-[11px] sm:text-xs text-[#94a3b8] truncate">{subtitle}</p>}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "#242a32" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] transition-colors cursor-pointer shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            )}

            {/* Modal Body Container */}
            <div className={`flex-1 min-h-0 ${bodyClassName || "overflow-y-auto pr-1"}`}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
