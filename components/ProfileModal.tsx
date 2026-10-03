"use client";

import React from "react";
import { useAuthStore, useUIStore } from "@/stores";
import { User, X, Flame, Award, Sliders } from "lucide-react";
import { LANGUAGE_FLAGS, Language } from "@/enums";

export function ProfileModal() {
  const isProfileOpen = useUIStore((s) => s.isProfileOpen);
  const setProfileOpen = useUIStore((s) => s.setProfileOpen);
  const setCalibrationOpen = useUIStore((s) => s.setCalibrationOpen);

  const user = useAuthStore((s) => s.user);

  if (!isProfileOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161c23] border border-[#2a3340] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3340]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center border border-[#22c55e]/40">
              <User className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Learner Profile & Portfolio</h3>
          </div>
          <button
            onClick={() => setProfileOpen(false)}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card Top */}
        <div className="flex items-center gap-4 bg-[#1a2027] border border-[#2a3340] p-4 rounded-xl">
          <div className="relative">
            <img
              src={
                user.avatarUrl ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              }
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#22c55e]"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-[#1a2027]"></span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-[#dde3ed]">{user.name}</h4>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                Verified Speaker
              </span>
            </div>
            <span className="text-xs text-[#94a3b8]">
              {user.location || "Global"} • Member since Jan 2026
            </span>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="text-[#dde3ed] font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#eab308]" />
                {user.karma} Karma
              </span>
              <span className="text-[#dde3ed] font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#22c55e]" />
                {user.streak} Day Streak
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
            {Object.entries(user.cefrPortfolio).map(([langName, level]) => {
              const flag =
                LANGUAGE_FLAGS[langName as Language] ||
                LANGUAGE_FLAGS[Language.ENGLISH] ||
                "🌐";
              return (
                <div
                  key={langName}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1a2027] border border-[#2a3340]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{flag}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#dde3ed]">{langName}</span>
                      <span className="text-[10px] text-[#94a3b8]">Verified Proficiency</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#242a32] text-[#22c55e] text-xs font-bold border border-[#2a3340]">
                    {level}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speaking Practice Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-[#1a2027] border border-[#2a3340] rounded-xl">
            <span className="text-lg font-bold text-[#22c55e]">{user.hoursSpoken} hrs</span>
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
              setProfileOpen(false);
              setCalibrationOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e] hover:text-[#4be277] cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Check Microphone & Audio</span>
          </button>

          <button
            onClick={() => setProfileOpen(false)}
            className="px-4 py-2 rounded-xl bg-[#242a32] hover:bg-[#2f353d] text-xs font-bold text-[#dde3ed] border border-[#2a3340] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
