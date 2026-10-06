"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ExternalLink } from "lucide-react";

interface ImageLightboxProps {
  imageUrl: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ imageUrl, alt = "Attachment preview", onClose }: ImageLightboxProps) {
  // Listen for ESC key to dismiss
  useEffect(() => {
    if (!imageUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageUrl, onClose]);

  // Lock body scroll when lightbox is active
  useEffect(() => {
    if (imageUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [imageUrl]);

  if (!imageUrl) return null;

  // Extract filename from URL
  const filename = imageUrl.split("/").pop() || "attachment";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none"
        aria-modal="true"
        role="dialog"
      >
        {/* Top Control Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 inset-x-4 max-w-4xl mx-auto flex items-center justify-between z-10 px-4 py-2.5 rounded-xl bg-[#161c23]/80 border border-[#2a3340]/60 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="text-xs sm:text-sm font-medium text-[#dde3ed] truncate">
              {filename}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download Link */}
            <a
              href={imageUrl}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-[#242a32] hover:bg-[#2f353d] text-[#dde3ed] hover:text-[#22c55e] border border-[#2a3340] transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Open in new tab */}
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-[#242a32] hover:bg-[#2f353d] text-[#dde3ed] hover:text-[#22c55e] border border-[#2a3340] transition-colors"
              title="Open full size in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#242a32] hover:bg-red-500/20 text-[#dde3ed] hover:text-red-400 border border-[#2a3340] hover:border-red-500/40 transition-colors cursor-pointer"
              title="Close lightbox (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Image Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[85vh] max-w-[90vw] flex items-center justify-center pt-10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={alt}
            className="max-h-[80vh] max-w-[88vw] object-contain rounded-xl shadow-2xl border border-[#2a3340]/50"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
