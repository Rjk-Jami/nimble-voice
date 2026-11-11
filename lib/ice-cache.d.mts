export interface IceDiagnosticState {
  mode: "turn-disabled" | "endpoint-unavailable";
  message: string;
}

export interface IceServerEntry {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceServersPayload {
  iceServers: IceServerEntry[];
  turnEnabled: boolean;
  ttlSeconds: number;
  expiresAt?: string;
}

export interface IceConfigResult {
  config: RTCConfiguration;
  diagnostic: IceDiagnosticState | null;
  turnEnabled: boolean;
  fromCache: boolean;
}

export interface IceConfigManagerOptions {
  fetcher: () => Promise<unknown>;
  now?: () => number;
}

export interface IceConfigManager {
  getIceConfiguration(options?: { forceRefresh?: boolean }): Promise<IceConfigResult>;
  clearCache(): void;
}

export declare const STUN_ONLY_ICE_SERVERS: RTCConfiguration;

export declare function parseIceServersPayload(payload: unknown): IceServersPayload;

export declare function createIceConfigManager(options: IceConfigManagerOptions): IceConfigManager;
