"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useAuthStore, useUIStore, useRoomStore } from "@/stores";
import { useUserProfileApi } from "@/hooks";
import { User, Flame, Award, Sliders, Edit2, Check, X, Radio, Play, Trash2 } from "lucide-react";
import { LANGUAGE_FLAGS, Language } from "@/enums";
import { MotionButton } from "./motion/MotionButton";
import { MotionModal } from "./motion/MotionModal";
import { apiClient } from "@/lib/axios";
import { normalizeRoom } from "@/lib/normalize";

export function ProfileModal() {
  const isProfileOpen = useUIStore((s) => s.isProfileOpen);
  const setProfileOpen = useUIStore((s) => s.setProfileOpen);
  const setCalibrationOpen = useUIStore((s) => s.setCalibrationOpen);

  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const joinRoomInStore = useRoomStore((s) => s.joinRoom);
  const { updatePortfolio: updatePortfolioApi } = useUserProfileApi();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [location, setLocation] = useState(user?.location || "");
  const [nativeLanguage, setNativeLanguage] = useState(user?.nativeLanguage || "English");
  const [learningLanguage, setLearningLanguage] = useState(user?.learningLanguage || "Spanish");

  const { data: hostedRoomsData, mutate: mutateHostedRooms } = useSWR<any>(
    isProfileOpen && user?.id ? `/api/v1/users/me/rooms` : null,
    async (url: string) => {
      try {
        const res: any = await apiClient.get(url);
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    }
  );

  const hostedRooms = Array.isArray(hostedRoomsData) ? hostedRoomsData : [];

  const handleReopenRoom = async (r: any) => {
    try {
      const res: any = await apiClient.post(`/api/v1/rooms/${r.id}/reopen`);
      const target = res?.room || res?.data || res || r;
      joinRoomInStore(normalizeRoom(target), user);
      setProfileOpen(false);
    } catch (err) {
      console.error("Failed to reopen room:", err);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (confirm("Permanently delete this saved room?")) {
      try {
        await apiClient.delete(`/api/v1/rooms/${roomId}`);
        mutateHostedRooms();
      } catch (err) {
        console.error("Failed to delete room:", err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      location: location.trim() || "Global",
      nativeLanguage,
      learningLanguage,
      isGuest: false,
    };
    updateProfile(payload);
    await updatePortfolioApi(payload);
    setIsEditing(false);
  };


  return (
    <MotionModal
      isOpen={isProfileOpen && !!user}
      onClose={() => setProfileOpen(false)}
      title="Learner Profile & Identity"
      icon={<User className="w-4 h-4" />}
      maxWidth="max-w-lg sm:max-w-xl"
      bodyClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      {user && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-4">
            {/* User Card Top - responsive stacked on mobile, row on tablet/desktop */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between bg-[#1a2027] border border-[#2a3340] p-4 rounded-xl gap-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                <div className="relative shrink-0">
                  <img
                    src={
                      user.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`
                    }
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#22c55e]"
                  />
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-[#1a2027]"></span>
                </div>

                <div className="flex flex-col items-center sm:items-start">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h4 className="font-bold text-base text-[#dde3ed]">{user.name}</h4>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        user.isGuest
                          ? "bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30"
                          : "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30"
                      }`}
                    >
                      {user.isGuest ? "Guest Mode" : "Active Learner"}
                    </span>
                  </div>
                  <span className="text-xs text-[#94a3b8] mt-1">
                    {user.location || "Global"} • Native: {user.nativeLanguage} • Learning: {user.learningLanguage}
                  </span>
                  <div className="flex items-center gap-3 mt-2 text-xs">
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

              <button
                onClick={() => {
                  setName(user.name);
                  setLocation(user.location || "");
                  setNativeLanguage(user.nativeLanguage);
                  setLearningLanguage(user.learningLanguage);
                  setIsEditing(!isEditing);
                }}
                className="p-2 rounded-lg bg-[#242a32] hover:bg-[#2f353d] text-[#94a3b8] hover:text-[#dde3ed] transition-colors cursor-pointer self-center sm:self-start shrink-0"
                title="Edit Profile"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Inline Editor */}
            {isEditing && (
              <form
                onSubmit={handleSave}
                className="p-4 rounded-xl bg-[#161c23] border border-[#22c55e]/40 flex flex-col gap-3 animate-fade-in"
              >
                <span className="text-xs font-bold text-[#22c55e] uppercase tracking-wider">
                  Edit Display Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#94a3b8]">Your Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-[#1a2027] text-xs text-[#dde3ed] p-2.5 rounded-lg border border-[#2a3340] focus:border-[#22c55e] focus:outline-none min-h-[40px]"
                      placeholder="Enter name"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#94a3b8]">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-[#1a2027] text-xs text-[#dde3ed] p-2.5 rounded-lg border border-[#2a3340] focus:border-[#22c55e] focus:outline-none min-h-[40px]"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2a3340]">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[#94a3b8] hover:text-[#dde3ed] hover:bg-[#242a32]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#22c55e] text-[#003915] text-xs font-bold hover:bg-[#4be277]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </form>
            )}

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

            {/* Dynamic Speaking Practice Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-3 bg-[#1a2027] border border-[#2a3340] rounded-xl">
                <span className="text-base sm:text-lg font-bold text-[#22c55e]">{user.hoursSpoken} hrs</span>
                <p className="text-[10px] sm:text-[11px] text-[#94a3b8] mt-0.5">Spoken this month</p>
              </div>
              <div className="p-3 bg-[#1a2027] border border-[#2a3340] rounded-xl">
                <span className="text-base sm:text-lg font-bold text-[#dde3ed]">
                  {user.totalRoomsJoined || 1} rooms
                </span>
                <p className="text-[10px] sm:text-[11px] text-[#94a3b8] mt-0.5">Joined or hosted</p>
              </div>
              <div className="p-3 bg-[#1a2027] border border-[#2a3340] rounded-xl">
                <span className="text-base sm:text-lg font-bold text-[#dde3ed]">
                  {user.frequentPartnersCount || 0} peers
                </span>
                <p className="text-[10px] sm:text-[11px] text-[#94a3b8] mt-0.5">Frequent partners</p>
              </div>
            </div>

            {/* Persistent Host Rooms */}
            {!user.isGuest && (
              <div className="bg-[#1a2027] border border-[#2a3340] rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#22c55e]" />
                    <h5 className="font-bold text-xs sm:text-sm text-[#dde3ed]">
                      My Hosted Study Rooms
                    </h5>
                  </div>
                  <span className="text-[10px] font-semibold text-[#94a3b8] px-2 py-0.5 rounded-md bg-[#242a32] border border-[#2a3340]">
                    {hostedRooms.length} saved
                  </span>
                </div>

                {hostedRooms.length === 0 ? (
                  <p className="text-xs text-[#94a3b8] italic text-center py-2.5">
                    No hosted rooms yet. Rooms you create will stay saved here for quick reopening!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {hostedRooms.map((r: any) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#242a32]/60 border border-[#2a3340] gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{r.flag || "🎙️"}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-[#dde3ed] truncate">
                              {r.title}
                            </span>
                            <span className="text-[10px] text-[#94a3b8]">
                              {r.language} • {r.status === "LIVE" ? "Currently Live" : "Ended / Saved"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleReopenRoom(r)}
                            title="Reopen Room"
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[#22c55e]/20 hover:bg-[#22c55e]/30 text-[#22c55e] text-xs font-semibold border border-[#22c55e]/30 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            <span>{r.status === "LIVE" ? "Enter" : "Reopen"}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(r.id)}
                            title="Delete Room"
                            className="p-1 rounded hover:bg-[#ef4444]/20 text-[#94a3b8] hover:text-[#ef4444] transition-colors border border-[#2a3340]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#2a3340] shrink-0 mt-3">
            <button
              onClick={() => {
                setProfileOpen(false);
                setCalibrationOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e] hover:text-[#4be277] cursor-pointer min-h-[36px]"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden xs:inline">Check Microphone & Audio</span>
              <span className="xs:hidden">Audio Test</span>
            </button>

            <MotionButton
              variant="secondary"
              size="sm"
              onClick={() => setProfileOpen(false)}
            >
              Close
            </MotionButton>
          </div>
        </div>
      )}
    </MotionModal>
  );
}
