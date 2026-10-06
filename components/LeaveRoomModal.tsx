"use client";

import React from "react";
import { useUIStore, useRoomStore, useVoiceStore } from "@/stores";
import { webrtcMeshManager } from "@/lib/webrtc";
import { apiClient } from "@/lib/axios";
import { API_PATHS } from "@/constants";
import { PhoneOff, AlertTriangle, Users, Clock } from "lucide-react";
import { MotionModal } from "./motion/MotionModal";
import { MotionButton } from "./motion/MotionButton";

export function LeaveRoomModal() {
  const isLeaveConfirmOpen = useUIStore((s) => s.isLeaveConfirmOpen);
  const pendingNavTab = useUIStore((s) => s.pendingNavTab);
  const closeLeaveConfirm = useUIStore((s) => s.closeLeaveConfirm);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const currentRoom = useRoomStore((s) => s.currentRoom);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);
  const resetVoiceState = useVoiceStore((s) => s.resetVoiceState);

  const handleConfirmLeave = async () => {
    if (currentRoom?.id) {
      // Notify backend non-blockingly
      apiClient.post(API_PATHS.ROOMS.LEAVE(currentRoom.id)).catch((err) => {
        console.warn("[LeaveRoomModal] Backend leave notice error:", err);
      });
    }

    // Synchronously stop all media tracks, audio elements, and peer connections
    webrtcMeshManager.destroy();

    // Reset local audio state and clear active room
    resetVoiceState();
    leaveRoom();

    // If an in-app tab navigation was pending, redirect to that tab
    if (pendingNavTab) {
      setActiveTab(pendingNavTab);
    }

    closeLeaveConfirm();
  };

  const handleCancel = () => {
    // Keep in-call state and media tracks completely intact
    closeLeaveConfirm();
  };

  return (
    <MotionModal
      isOpen={isLeaveConfirmOpen && !!currentRoom}
      onClose={handleCancel}
      title="End Call / Leave Room"
      subtitle="Confirm your exit from the active voice session"
      icon={<PhoneOff className="w-5 h-5 text-[#ef4444]" />}
      maxWidth="max-w-md"
      bodyClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className="flex flex-col gap-4">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/25">
          <AlertTriangle className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" />
          <div className="flex flex-col text-xs">
            <span className="font-bold text-[#dde3ed]">Disconnecting Audio Session</span>
            <span className="text-[#94a3b8] mt-0.5 leading-relaxed">
              Your microphone will be turned off and your peer connections will be closed.
              {pendingNavTab && ` You will navigate to the ${pendingNavTab} section.`}
            </span>
          </div>
        </div>

        {/* Current Room Snapshot */}
        {currentRoom && (
          <div className="p-3.5 bg-[#1a2027] border border-[#2a3340] rounded-xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0">{currentRoom.flag || "🎙️"}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs sm:text-sm text-[#dde3ed] truncate">
                  {currentRoom.title}
                </span>
                <span className="text-[11px] text-[#94a3b8]">
                  {currentRoom.language} • {currentRoom.levelLabel || "All Levels"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2a3340]/60 text-xs text-[#94a3b8]">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#22c55e]" />
                {currentRoom.participants.length} / {currentRoom.maxSlots} participants
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#94a3b8]" />
                Active Call
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a3340] shrink-0">
          <MotionButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-xs font-semibold"
          >
            Stay in Room
          </MotionButton>
          <MotionButton
            type="button"
            variant="danger"
            size="md"
            onClick={handleConfirmLeave}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Room</span>
          </MotionButton>
        </div>
      </div>
    </MotionModal>
  );
}
