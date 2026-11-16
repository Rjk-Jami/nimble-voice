"use client";

import { Users } from "lucide-react";
import { useOnlineLearners } from "@/hooks/useOnlineLearners";

export function OnlineLearners({ compact = false }: { compact?: boolean }) {
  const { count, connected, reconnecting } = useOnlineLearners();
  const isLoading = count === null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${compact ? "text-[10px]" : "text-xs sm:text-sm"
        } ${connected && !isLoading ? "text-[#dde3ed]" : "text-[#94a3b8]"}`}
      role="status"
      aria-live="polite"
      aria-label={
        isLoading
          ? "Connecting to presence..."
          : connected
            ? `${count.toLocaleString()} ${count === 1 ? "learner online" : "learners online"
            }`
            : reconnecting
              ? `${count.toLocaleString()} learners online (reconnecting)`
              : "Presence offline"
      }
      title={
        isLoading
          ? "Connecting to audio network..."
          : connected
            ? "Authoritative live presence count"
            : "Reconnecting to audio network..."
      }
    >
      <span
        aria-hidden="true"
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${connected && !isLoading ? "bg-[#4be277]" : "bg-[#94a3b8]"
          }`}
      />
      {isLoading ? "—" : count.toLocaleString()}
      <span className="font-normal text-[#94a3b8]">
        {isLoading
          ? "connecting..."
          : compact
            ? "online"
            : count === 1
              ? "learner online"
              : "learners online"}
      </span>
      {compact && <Users aria-hidden="true" className="w-3 h-3 text-[#94a3b8]" />}
    </span>
  );
}
