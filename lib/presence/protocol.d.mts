export interface PresenceEvent {
  version: 1;
  type: "presence:sync" | "presence:count";
  data: { onlineLearners: number };
}

export function parsePresenceEvent(raw: string): PresenceEvent | null;
