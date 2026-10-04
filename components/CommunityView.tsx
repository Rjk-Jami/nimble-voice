"use client";

import React from "react";
import { motion } from "framer-motion";
import { StaggerContainer } from "./motion/StaggerList";
import { StaggerItem } from "./motion/StaggerList";
import { MotionCard } from "./motion/MotionCard";

export function CommunityView() {
  return (
    <div className="w-full px-4 sm:px-6 py-8 max-w-[1400px] mx-auto flex flex-col gap-6 animate-fade-in">
      {/* Top Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-[#161c23] border border-[#2a3340] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl"
      >
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#22c55e] text-2xl">security</span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#dde3ed]">
              Community Safety & Audio Etiquette
            </h1>
          </div>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            Free4Talk is founded on peer respect, kindness, and open cultural exchange. Review our live speaking guidelines and community channels.
          </p>
        </div>

        {/* Quick report or help */}
        <div className="flex items-center gap-3">
          <motion.a
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5865F2] text-white text-xs sm:text-sm font-bold hover:bg-[#4752c4] transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-base">forum</span>
            <span>Join Discord Lounge</span>
          </motion.a>
        </div>
      </motion.div>

      {/* Safety Rules Matrix */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StaggerItem>
          <MotionCard enableHoverEffect={true} className="flex flex-col gap-3 h-full">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">hearing</span>
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Microphone Discipline</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Use headphones to prevent echo loops. If you are in a loud environment, please keep your microphone muted when not actively speaking.
            </p>
          </MotionCard>
        </StaggerItem>

        <StaggerItem>
          <MotionCard enableHoverEffect={true} className="flex flex-col gap-3 h-full">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">diversity_3</span>
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Be Patient with Learners</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Many learners are building courage to speak foreign languages for the first time. Offer constructive corrections kindly in the backchannel chat.
            </p>
          </MotionCard>
        </StaggerItem>

        <StaggerItem>
          <MotionCard enableHoverEffect={true} className="flex flex-col gap-3 h-full">
            <div className="w-10 h-10 rounded-xl bg-[#ef4444]/20 text-[#ef4444] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">shield</span>
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Zero Harassment Policy</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Harassment, hate speech, inappropriate video streaming, and commercial spam result in immediate and permanent hardware bans.
            </p>
          </MotionCard>
        </StaggerItem>
      </StaggerContainer>

      {/* Community Links & Moderation Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MotionCard enableHoverEffect={true} className="flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#dde3ed] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#22c55e]">flag</span>
              Need to Report a Room or User?
            </h3>
            <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
              Room hosts can kick trolls directly from their participant matrix. If an offender persists across rooms, our automated trust & safety team monitors flags 24/7.
            </p>
          </div>
          <button
            onClick={() => alert("Report form: In any active room, click on a participant's tile and choose 'Report to Mod Team'.")}
            className="w-fit px-4 py-2 rounded-xl bg-[#242a32] hover:bg-[#2f353d] text-[#dde3ed] text-xs font-semibold border border-[#2a3340] transition-colors cursor-pointer"
          >
            How In-Room Moderation Works
          </button>
        </MotionCard>

        <MotionCard enableHoverEffect={true} className="flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#dde3ed] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#60a5fa]">groups</span>
              Global Social Communities
            </h3>
            <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
              Connect with 45,000+ language learners outside voice rooms on Discord, Reddit, and Facebook for vocabulary exchanges and study groups.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-[#242a32] text-xs font-medium text-[#dde3ed] hover:text-[#22c55e] border border-[#2a3340] transition-colors"
            >
              Discord Server
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-[#242a32] text-xs font-medium text-[#dde3ed] hover:text-[#22c55e] border border-[#2a3340] transition-colors"
            >
              Facebook Group
            </a>
          </div>
        </MotionCard>
      </div>
    </div>
  );
}
