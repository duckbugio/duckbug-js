import type { DuckBugErrorEvent, DuckBugLogEvent } from "../contract";

/** When set by {@link DuckSDK}, the event already passed finalize + beforeSend in core. */
export type SendEventMeta = {
  skipPrivacyPipeline?: boolean;
};

/**
 * Pluggable destination for canonical DuckBug ingest events.
 * Console-style methods exist for {@link LogProvider} hooks only.
 */
export interface Provider {
  sendLog(event: DuckBugLogEvent, meta?: SendEventMeta): void | Promise<void>;
  sendError(
    event: DuckBugErrorEvent,
    meta?: SendEventMeta,
  ): void | Promise<void>;
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}
