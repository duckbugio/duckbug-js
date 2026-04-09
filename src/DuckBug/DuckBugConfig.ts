import type { DuckBugErrorEvent, DuckBugLogEvent } from "../contract";
import type { StrippableIngestSection } from "./stripIngestSections";
import type { TransportFailureInfo } from "./transportTypes";

export type BeforeSendIngestArg =
  | { kind: "log"; event: DuckBugLogEvent }
  | { kind: "error"; event: DuckBugErrorEvent };

export type BeforeSendIngestResult =
  | DuckBugLogEvent
  | DuckBugErrorEvent
  | null
  | undefined;

export type DuckBugTransportConfig = {
  /** When &lt;= 1, each event is POSTed to single-event ingest. When &gt; 1, batches use /batch until flush. Default 1. */
  maxBatchSize?: number;
  maxRetries?: number;
  /** Base delay; attempts use exponential backoff from this value. */
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
};

export type DuckBugConfig = {
  dsn: string;
  extraSensitiveKeys?: string[];
  stripSections?: StrippableIngestSection[];
  /**
   * Runs after strip/sanitize/eventId for direct `DuckBugProvider` sends.
   * When using `DuckSDK`, prefer `DuckSDK` constructor `beforeSend`.
   */
  beforeSend?: (
    arg: BeforeSendIngestArg,
  ) => BeforeSendIngestResult | Promise<BeforeSendIngestResult>;
  transport?: DuckBugTransportConfig;
  onTransportError?: (info: TransportFailureInfo) => void;
};
