"use client";

import React, { useState } from "react";
import { TOPIC_PROMPTS } from "@/lib/data";
import { useUIStore } from "@/stores";
import { Lightbulb, Shuffle, ArrowRight } from "lucide-react";

export function TopicsView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#161c23] border border-[#2a3340] rounded-2xl p-6 shadow-xl">
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

        <button
          onClick={handlePickRandom}
          className="flex items-center gap-2 bg-[#22c55e] text-[#003915] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl hover:bg-[#4be277] transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95 cursor-pointer shrink-0"
        >
          <Shuffle className="w-4 h-4" />
          <span>Pick Random Topic</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border cursor-pointer ${
              selectedCategory === cat
                ? "bg-[#22c55e] text-[#003915] border-[#22c55e] shadow-md font-bold"
                : "bg-[#161c23] text-[#94a3b8] hover:text-[#dde3ed] border-[#2a3340] hover:bg-[#1a2027]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Topic Grid */}
      <div className="flex flex-col gap-8">
        {displayedTopics.map((section) => (
          <div key={section.category} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#dde3ed] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></span>
              {section.category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.prompts.map((prompt, index) => (
                <div
                  key={index}
                  className="bg-[#161c23] hover:bg-[#1a2027] border border-[#2a3340] hover:border-[#22c55e]/60 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-md hover:shadow-xl group"
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
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
