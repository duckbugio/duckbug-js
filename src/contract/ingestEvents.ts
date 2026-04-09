import type { LogLevel } from "../SDK/LogLevel";

/** JSON values allowed by DuckBug ingest schemas for open fields. */
export type IngestJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: IngestJsonValue }
  | IngestJsonValue[];

/** Request-related maps after privacy filtering (schema: object with arbitrary keys). */
export type IngestStringMap = Record<string, unknown>;

/** Shared optional fields from docs/02-error-log-contract.md */
export type IngestSharedMetadata = {
  eventId?: string;
  fingerprint?: string;
  dTags?: string[];
  context?: IngestJsonValue;
  ip?: string;
  url?: string;
  method?: string;
  headers?: IngestStringMap;
  queryParams?: IngestStringMap;
  bodyParams?: IngestStringMap;
  cookies?: IngestStringMap;
  /** Session map; duckbug.io ingest currently rejects top-level `session` (400). Prefer `context` / `extra`. */
  session?: IngestStringMap;
  files?: IngestStringMap;
  env?: IngestStringMap;
  platform?: string;
  release?: string;
  environment?: string;
  dist?: string;
  serverName?: string;
  service?: string;
  requestId?: string;
  transaction?: string;
  traceId?: string;
  spanId?: string;
  sdk?: IngestJsonValue;
  user?: IngestJsonValue;
  runtime?: IngestJsonValue;
  breadcrumbs?: IngestJsonValue;
  extra?: IngestJsonValue;
};

/** Canonical DuckBug error event (wire contract). */
export type DuckBugErrorEvent = IngestSharedMetadata & {
  time: number;
  message: string;
  stacktrace: IngestJsonValue;
  file: string;
  line: number;
  exception?: IngestJsonValue;
  stacktraceAsString?: string;
  handled?: boolean;
  mechanism?: string;
};

/** Canonical DuckBug log event (wire contract). */
export type DuckBugLogEvent = IngestSharedMetadata & {
  time: number;
  level: LogLevel;
  message: string;
};
