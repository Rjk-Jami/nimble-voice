"use client";

import React, { useState } from "react";
import { TOPIC_PROMPTS } from "@/lib/data";
import { useUIStore } from "@/stores";
import { Lightbulb, Shuffle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { MotionButton } from "./motion/MotionButton";
import { TabGlider } from "./motion/TabGlider";
import { StaggerContainer, StaggerItem } from "./motion/StaggerList";
import { MotionCard } from "./motion/MotionCard";


export function TopicsView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const openCreateModal = useUIStore((s) => s.openCreateModal);

  const categories = ["All", ...TOPIC_PROMPTS.map((c) => c.category)];

  const displayedTopics =
    selectedCategory === "All"
      ? TOPIC_PROMPTS
      : TOPIC_PROMPTS.filter((c) => c.category === selectedCategory);

  const handlePickRandom = () => {
    const allPrompts = TOPIC_PROMPTS.flatMap((c) => c.prompts);
    const random = allPrompts[Math.floor(Math.random() * allPrompts.length)];
    openCreateModal(random.title);
  };

  return (
    <div className="w-full px-4 sm:px-6 py-8 max-w-[1400px] mx-auto flex flex-col gap-6 animate-fade-in">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#161c23] border border-[#2a3340] rounded-2xl p-6 shadow-xl"
      >
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-[#22c55e]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#dde3ed]">
              Conversation Prompts & Icebreakers
            </h1>
          </div>
          <p className="text-sm text-[#94a3b8]">
            Never run out of things to say. Choose a discussion card below to launch an engaging room or spark conversation with your language exchange partners.
          </p>
        </div>

        <MotionButton
          variant="primary"
          size="md"
          onClick={handlePickRandom}
          className="shrink-0"
        >
          <Shuffle className="w-4 h-4" />
          <span>Pick Random Topic</span>
        </MotionButton>
      </motion.div>

      {/* Dynamic Custom Prompt Creator */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#161c23] border border-[#2a3340] p-4 rounded-2xl shadow-md">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Type your own custom conversation topic or icebreaker question..."
          className="flex-1 bg-[#1a2027] text-xs sm:text-sm text-[#dde3ed] placeholder:text-[#94a3b8] px-4 py-2.5 rounded-xl border border-[#2a3340] focus:border-[#22c55e] focus:outline-none"
        />
        <MotionButton
          variant="primary"
          size="sm"
          disabled={!customPrompt.trim()}
          onClick={() => {
            if (!customPrompt.trim()) return;
            openCreateModal(customPrompt.trim());
            setCustomPrompt("");
          }}
          className="shrink-0"
        >
          <Lightbulb className="w-4 h-4" />
          <span>Launch Room With Topic</span>
        </MotionButton>
      </div>

      {/* Category Filter Pills with Glider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 relative">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedCategory(cat)}
              className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer select-none ${isSelected
                  ? "text-[#003915] font-bold"
                  : "bg-[#161c23] text-[#94a3b8] hover:text-[#dde3ed] border border-[#2a3340] hover:bg-[#1a2027]"
                }`}
            >
              {isSelected && (
                <TabGlider
                  layoutId="topics-category-glider"
                  className="absolute inset-0 bg-[#22c55e] rounded-xl -z-10 shadow-md"
                />
              )}
              <span>{cat}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Topic Grid */}
      <div className="flex flex-col gap-8">
        {displayedTopics.map((section) => (
          <div key={section.category} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#dde3ed] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></span>
              {section.category}
            </h2>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.prompts.map((prompt, index) => (
                <StaggerItem key={index}>
                  <MotionCard
                    enableHoverEffect={true}
                    className="flex flex-col justify-between gap-4 h-full"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-[#242a32] text-[#22c55e] font-semibold border border-[#2a3340]">
                          {prompt.level}
                        </span>
                        <span className="text-[#94a3b8] text-[11px]">#{prompt.tag}</span>
                      </div>
                      <p className="text-sm font-bold text-[#dde3ed] group-hover:text-[#4be277] transition-colors leading-snug mt-1">
                        "{prompt.title}"
                      </p>
                    </div>

                    <button
                      onClick={() => openCreateModal(prompt.title)}
                      className="flex items-center justify-between w-full pt-3 border-t border-[#2a3340] text-xs font-semibold text-[#22c55e] group-hover:text-[#4be277] transition-colors cursor-pointer"
                    >
                      <span>Start room with this topic</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </MotionCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        ))}
      </div>
    </div>
  );
}
