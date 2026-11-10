"use client";

import { Users } from "lucide-react";
import { useOnlineLearners } from "@/hooks/useOnlineLearners";

export function OnlineLearners({ compact = false }: { compact?: boolean }) {
  const { count, connected, reconnecting } = useOnlineLearners();
  const status = connected ? "Live" : reconnecting ? "Reconnecting" : "Count unavailable";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${compact ? "text-[10px]" : "text-xs sm:text-sm"} ${connected ? "text-[#dde3ed]" : "text-[#94a3b8]"}`}
      role="status"
      aria-live="polite"
      aria-label={
        connected && count !== null
          ? `${count.toLocaleString()} learners online`
          : count !== null
            ? `${count.toLocaleString()} learners online, count may be stale`
            : status
      }
      title={connected ? "Live unique learner count" : "Online learner count may be stale"}
    >
      <span
        aria-hidden="true"
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${connected ? "bg-[#4be277]" : "bg-[#94a3b8]"}`}
      />
      {count !== null ? count.toLocaleString() : "—"}
      <span className="font-normal text-[#94a3b8]">
        {connected ? "learners online" : count !== null ? "learners · stale" : "learners online"}
      </span>
      {compact && <Users aria-hidden="true" className="w-3 h-3 text-[#94a3b8]" />}
    </span>
  );
}
