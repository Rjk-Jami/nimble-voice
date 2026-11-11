import { API_PATHS } from "@/constants/apiPaths";
import { apiClient } from "@/lib/axios";
import {
  STUN_ONLY_ICE_SERVERS,
  createIceConfigManager,
  type IceConfigResult,
  type IceDiagnosticState,
} from "@/lib/ice-cache.mjs";

const iceConfigManager = createIceConfigManager({
  fetcher: () =>
    apiClient.get(API_PATHS.WEBRTC.ICE_SERVERS, {
      timeout: 5000,
    }),
});

export { STUN_ONLY_ICE_SERVERS };
export type { IceConfigResult, IceDiagnosticState };

export function getIceConfiguration(options?: {
  forceRefresh?: boolean;
}): Promise<IceConfigResult> {
  return iceConfigManager.getIceConfiguration(options);
}

export function clearIceConfigurationCache(): void {
  iceConfigManager.clearCache();
}
