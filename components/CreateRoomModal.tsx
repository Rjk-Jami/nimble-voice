"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Language, CEFRLevel, LANGUAGE_FLAGS } from "@/enums";
import { createRoomSchema, CreateRoomInput } from "@/schemas";
import { useUIStore, useAuthStore } from "@/stores";
import { useRooms } from "@/hooks";
import { PlusCircle, Radio, Sparkles } from "lucide-react";
import { MotionButton } from "./motion/MotionButton";
import { MotionModal } from "./motion/MotionModal";

export function CreateRoomModal() {
  const isCreateOpen = useUIStore((s) => s.isCreateOpen);
  const initialTopic = useUIStore((s) => s.createInitialTopic);
  const closeCreateModal = useUIStore((s) => s.closeCreateModal);

  const { createRoom } = useRooms();
  const user = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateRoomInput>({
    defaultValues: {
      title: "",
      language: Language.ENGLISH,
      cefrLevel: CEFRLevel.ANY,
      maxSlots: 5,
      topicTag: "Casual & Life",
      isBeginnerFriendly: true,
    },
  });

  useEffect(() => {
    if (initialTopic) {
      setValue("title", initialTopic);
    }
  }, [initialTopic, setValue]);

  const onSubmit = async (data: CreateRoomInput) => {
    const validation = createRoomSchema.safeParse(data);
    if (!validation.success) {
      alert(validation.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    const hostUser = user || {
      id: "p-host-1",
      name: "Alex Miller",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      location: "San Francisco, CA",
      nativeLanguage: "English",
      learningLanguage: "Spanish",
      isVerified: true,
      cefrPortfolio: { English: CEFRLevel.NATIVE },
      karma: 142,
      hoursSpoken: 38.5,
      streak: 18,
    };

    await createRoom(validation.data, hostUser);
    closeCreateModal();
    reset();
  };

  const currentMaxSlots = watch("maxSlots");
  const languageOptions = Object.values(Language).filter((l) => l !== Language.ALL);
  const cefrOptions = Object.values(CEFRLevel);

  return (
    <MotionModal
      isOpen={isCreateOpen}
      onClose={closeCreateModal}
      title="Create a New Voice Room"
      subtitle="React Hook Form + Zod v4 validated"
      icon={<PlusCircle className="w-5 h-5" />}
      maxWidth="max-w-lg sm:max-w-xl"
      bodyClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      {/* Form with scrollable body and sticky actions */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-4">
          {/* Room Title */}
          <div>
            <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">
              Room Title / Discussion Topic *
            </label>
            <input
              type="text"
              {...register("title", { required: true, minLength: 3, maxLength: 80 })}
              placeholder="e.g. Daily routine, travel stories, favorite books..."
              className="w-full bg-[#1a2027] text-[#dde3ed] placeholder:text-[#94a3b8] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-all"
            />
            {errors.title && (
              <span className="text-[11px] text-[#ef4444] mt-1 block">
                {errors.title.message || "Please provide a valid title (3-80 characters)"}
              </span>
            )}
          </div>

          {/* Language and CEFR Level in responsive 1/2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">Language</label>
              <select
                {...register("language")}
                className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_FLAGS[lang] || "🌐"} {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">
                Level Requirement
              </label>
              <select
                {...register("cefrLevel")}
                className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
              >
                {cefrOptions.map((level) => (
                  <option key={level} value={level}>
                    {level === CEFRLevel.ALL
                      ? "All Levels Welcome"
                      : level === CEFRLevel.NATIVE
                        ? "Native Speakers Only"
                        : `${level} Level`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Participant limit & Topic Tag in responsive 1/2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#1a2027] p-3 rounded-xl border border-[#2a3340]">
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">
                Max Speakers: <span className="text-[#22c55e] font-bold">{currentMaxSlots}</span>
              </label>
              <input
                type="range"
                min="2"
                max="8"
                {...register("maxSlots", { valueAsNumber: true })}
                className="w-full accent-[#22c55e] cursor-pointer mt-1"
              />
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                <span>2 (Pair)</span>
                <span>5 (Standard)</span>
                <span>8 (Group)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1.5">Category Tag</label>
              <select
                {...register("topicTag")}
                className="w-full bg-[#1a2027] text-[#dde3ed] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-[#2a3340] focus:outline-none focus:border-[#22c55e]"
              >
                <option value="Casual & Life">#Casual & Life</option>
                <option value="Grammar & Vocab">#Grammar & Vocab</option>
                <option value="Culture & Travel">#Culture & Travel</option>
                <option value="Tech & Business">#Tech & Business</option>
                <option value="Exam Prep (IELTS/DELE)">#Exam Prep</option>
                <option value="Pop Culture & Movies">#Pop Culture</option>
              </select>
            </div>
          </div>

          {/* Beginner Friendly Toggle */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1a2027] border border-[#2a3340] cursor-pointer hover:border-[#2a3340]/90 transition-colors">
            <input
              type="checkbox"
              {...register("isBeginnerFriendly")}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#dde3ed] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />
                Patient & Beginner-Friendly Room
              </span>
              <span className="text-[11px] text-[#94a3b8]">
                Welcoming atmosphere with slower pacing for learners
              </span>
            </div>
          </label>
        </div>

        {/* Sticky Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a3340] shrink-0 mt-3">
          <MotionButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeCreateModal}
          >
            Cancel
          </MotionButton>
          <MotionButton
            type="submit"
            variant="primary"
            size="md"
          >
            <Radio className="w-4 h-4" />
            <span>Launch Room & Join</span>
          </MotionButton>
        </div>
      </form>
    </MotionModal>
  );
}
