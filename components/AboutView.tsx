"use client";

import React from "react";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "./motion/StaggerList";
import { MotionCard } from "./motion/MotionCard";
import { MotionButton } from "./motion/MotionButton";

export function AboutView() {
  return (
    <div className="w-full px-4 sm:px-6 py-8 max-w-[1200px] mx-auto flex flex-col gap-8 animate-fade-in">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-[#161c23] border border-[#2a3340] rounded-2xl p-6 sm:p-10 shadow-2xl flex flex-col gap-4 text-center sm:text-left"
      >
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span>
          <span className="text-xs font-bold text-[#22c55e] tracking-widest uppercase">
            Our Mission & Ethos
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#dde3ed] tracking-tight">
          Fluency happens through real conversation, not just flashcards.
        </h1>
        <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed max-w-3xl">
          NimbleVoice is an open-access, browser-native Free4Talk clone designed to remove every friction point between eager language learners and authentic spoken practice. No subscriptions, no algorithmic paywalls, just low-latency peer audio rooms.
        </p>
      </motion.div>

      {/* Feature Pillars */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StaggerItem>
          <MotionCard enableHoverEffect={true} className="flex flex-col gap-3 p-6 h-full">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center font-bold">
              01
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Zero Install Friction</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Runs natively in standard modern browsers utilizing WebRTC audio mesh networks without requiring app store downloads or third-party plugins.
            </p>
          </MotionCard>
        </StaggerItem>

        <StaggerItem>
          <MotionCard enableHoverEffect={true} className="flex flex-col gap-3 p-6 h-full">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center font-bold">
              02
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Tactile In-Call Aids</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Equipped with real-time speaker detection, CEFR badges, backchannel text notebooks for vocabulary sharing, and live audio peak indicators.
            </p>
          </MotionCard>
        </StaggerItem>

        <StaggerItem>
          <MotionCard enableHoverEffect={true} className="flex flex-col gap-3 p-6 h-full">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center font-bold">
              03
            </div>
            <h3 className="font-bold text-base text-[#dde3ed]">Community Moderated</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Room creators retain granular stage authority to ensure calm, courteous discussions. Toxic conduct is eliminated quickly through community consensus.
            </p>
          </MotionCard>
        </StaggerItem>
      </StaggerContainer>

      {/* Support & Server Infrastructure */}
      <MotionCard
        enableHoverEffect={false}
        className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#eab308] text-2xl">local_cafe</span>
            <h3 className="text-lg font-bold text-[#dde3ed]">Support NimbleVoice Server Costs</h3>
          </div>
          <p className="text-xs sm:text-sm text-[#94a3b8] max-w-xl leading-relaxed">
            We run high-bandwidth global TURN/STUN audio relay servers to keep latency below 30ms worldwide. A voluntary coffee keeps this platform 100% free for everyone.
          </p>
        </div>

        <MotionButton
          variant="primary"
          size="md"
          onClick={() => alert("Coffee Support: Thank you! Contributions fund WebRTC servers and continuous infrastructure upgrades.")}
          className="bg-[#eab308] hover:bg-yellow-400 text-[#161c23] border-[#eab308] shrink-0"
        >
          <span className="material-symbols-outlined text-base">favorite</span>
          <span>Buy Us a Coffee</span>
        </MotionButton>
      </MotionCard>
    </div>
  );
}
