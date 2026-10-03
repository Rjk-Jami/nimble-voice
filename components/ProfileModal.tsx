"use client";

import React from "react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCalibration: () => void;
}

export function ProfileModal({ isOpen, onClose, onOpenCalibration }: ProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161c23] border border-[#2a3340] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3340]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#22c55e] text-2xl">account_circle</span>
            <h3 className="font-bold text-base text-[#dde3ed]">Learner Profile & Portfolio</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* User Card Top */}
        <div className="flex items-center gap-4 bg-[#1a2027] border border-[#2a3340] p-4 rounded-xl">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Alex Miller"
              className="w-16 h-16 rounded-full object-cover border-2 border-[#22c55e]"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-[#1a2027]"></span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-[#dde3ed]">Alex Miller</h4>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                Verified Speaker
              </span>
            </div>
            <span className="text-xs text-[#94a3b8]">San Francisco, CA • Member since Jan 2026</span>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="text-[#dde3ed] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#eab308]">workspace_premium</span>
                142 Karma
              </span>
              <span className="text-[#dde3ed] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#22c55e]">local_fire_department</span>
                18 Day Streak
              </span>
            </div>
          </div>
        </div>

        {/* Spoken & Target Languages Portfolio */}
        <div className="flex flex-col gap-2.5">
          <h5 className="text-xs font-bold text-[#dde3ed] uppercase tracking-wider">
            Language Proficiencies (CEFR)
          </h5>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇬🇧</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#dde3ed]">English</span>
                  <span className="text-[10px] text-[#94a3b8]">Native Speaker & Moderator</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#242a32] text-[#22c55e] text-xs font-bold border border-[#2a3340]">
                NATIVE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇪🇸</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#dde3ed]">Spanish</span>
                  <span className="text-[10px] text-[#94a3b8]">Intermediate Conversationalist</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#242a32] text-[#60a5fa] text-xs font-bold border border-[#2a3340]">
                B1
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇯🇵</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#dde3ed]">Japanese</span>
                  <span className="text-[10px] text-[#94a3b8]">Basic Grammar & Pronunciation</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#242a32] text-[#f472b6] text-xs font-bold border border-[#2a3340]">
                A2
              </span>
            </div>
          </div>
        </div>

        {/* Speaking Practice Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-[#1a2027] border border-[#2a3340] rounded-xl">
            <span className="text-lg font-bold text-[#22c55e]">38.5 hrs</span>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">Spoken this month</p>
          </div>
          <div className="p-3 bg-[#1a2027] border border-[#2a3340] rounded-xl">
            <span className="text-lg font-bold text-[#dde3ed]">42 rooms</span>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">Joined or hosted</p>
          </div>
          <div className="p-3 bg-[#1a2027] border border-[#2a3340] rounded-xl">
            <span className="text-lg font-bold text-[#dde3ed]">19 peers</span>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">Frequent partners</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#2a3340]">
          <button
            onClick={() => {
              onClose();
              onOpenCalibration();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e] hover:text-[#4be277]"
          >
            <span className="material-symbols-outlined text-base">mic_external_on</span>
            <span>Check Microphone & Audio</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#242a32] hover:bg-[#2f353d] text-xs font-bold text-[#dde3ed] border border-[#2a3340] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
