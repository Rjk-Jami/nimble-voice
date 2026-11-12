import type {
  AckErrorCode,
  CanonicalClientCommand,
  CanonicalServerEvent,
  CommandAck,
  ServerEventEnvelope,
} from "@/types/socket";

export declare const SOCKET_SCHEMA_VERSION: 1;
export declare const CANONICAL_SERVER_EVENTS: ReadonlySet<CanonicalServerEvent>;
export declare const CANONICAL_CLIENT_COMMANDS: ReadonlySet<CanonicalClientCommand>;
export declare const VERSIONED_ROOM_EVENTS: ReadonlySet<CanonicalServerEvent>;

export declare class SocketCommandError extends Error {
  code: AckErrorCode | (string & {});
  requestId: string;
  cause?: unknown;
  constructor(
    message: string,
    code?: AckErrorCode | (string & {}),
    requestId?: string,
    cause?: unknown
  );
}

export type EnvelopeRejectionReason =
  | "invalid_envelope"
  | "invalid_schema_version"
  | "missing_event_id"
  | "unknown_event"
  | "missing_occurred_at"
  | "invalid_version"
  | "missing_data"
  | "duplicate_event_id"
  | "stale_version";

export type EnvelopeGuardResult =
  | { accepted: true; envelope: ServerEventEnvelope }
  | { accepted: false; reason: EnvelopeRejectionReason };

export interface EnvelopeGuardOptions {
  maxSeenEvents?: number;
}

export interface EnvelopeGuard {
  evaluate(raw: unknown): EnvelopeGuardResult;
  reset(): void;
}

export declare function createEnvelopeGuard(options?: EnvelopeGuardOptions): EnvelopeGuard;

export interface CommandTrackerOptions {
  defaultTimeoutMs?: number;
}

export interface RegisterCommandOptions {
  timeoutMs?: number;
}

export interface CommandTracker {
  createRequestId(): string;
  register<TData = unknown>(requestId: string, options?: RegisterCommandOptions): Promise<TData>;
  resolveAck(rawAck: CommandAck<unknown> | unknown): boolean;
  rejectAll(reason?: string): void;
  pendingCount(): number;
  clear(): void;
}

export declare function createCommandTracker(options?: CommandTrackerOptions): CommandTracker;
