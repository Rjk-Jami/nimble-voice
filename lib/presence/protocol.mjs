/** Parse the version 1 JSON envelope used by the presence WebSocket. */
export function parsePresenceEvent(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    if (
      value.version !== 1 ||
      (value.type !== "presence:sync" && value.type !== "presence:count") ||
      !value.data ||
      !Number.isSafeInteger(value.data.onlineLearners) ||
      value.data.onlineLearners < 0
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
