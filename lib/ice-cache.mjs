export const STUN_ONLY_ICE_SERVERS = Object.freeze({
  iceServers: Object.freeze([
    Object.freeze({ urls: "stun:stun.l.google.com:19302" }),
    Object.freeze({ urls: "stun:stun.cloudflare.com:3478" }),
  ]),
  iceCandidatePoolSize: 4,
});

export function parseIceServersPayload(_payload) {
  throw new Error("Not implemented");
}

export function createIceConfigManager(_options) {
  return {
    async getIceConfiguration() {
      throw new Error("Not implemented");
    },
    clearCache() {},
  };
}
