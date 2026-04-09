import type {
  DuckBugErrorEvent,
  DuckBugLogEvent,
  IngestSharedMetadata,
} from "../../src/contract";
import { logLevel } from "../../src/SDK/LogLevel";

export const LIVE_TAG_BASE = [
  "live-ingest",
  "@duckbug/js",
  "full-contract",
] as const;

/**
 * All optional shared fields from `IngestSharedMetadata` (log + error wire schemas).
 * `dTags` are added in {@link buildFullLiveLog} / {@link buildFullLiveError}.
 */
export function liveIngestSharedMetadata(time: number): IngestSharedMetadata {
  return {
    fingerprint: "duckbug-js-live-ingest-full-fp",
    context: {
      suite: "duckbugLiveIngestEnv",
      timeIso: new Date(time).toISOString(),
      flags: { fullPayload: true },
      /** Session-shaped data lives under `context` — ingest API returns 400 on top-level `session`. */
      sessionStub: { region: "test" },
    },
    ip: "203.0.113.10",
    url: "https://example.test/api/live-ingest",
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-live-ingest": "1",
    },
    queryParams: { source: "bun-test", case: "full" },
    bodyParams: { kind: "synthetic" },
    cookies: { session_ref: "live-ingest-stub" },
    files: { attachment: "stub.txt" },
    env: { NODE_ENV: "test" },
    platform: "node",
    release: "0.1.3",
    environment: "live-ingest",
    dist: "bun",
    serverName: "duckbug-js-live",
    service: "@duckbug/js",
    requestId: `live-req-${time}`,
    transaction: "live-ingest-txn",
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    spanId: "00f067aa0ba902b7",
    user: { id: "live-user-stub", tier: "test" },
    runtime: {
      name: "bun",
      version:
        typeof process !== "undefined" ? (process.versions?.bun ?? "") : "",
    },
    breadcrumbs: [
      {
        ts: time - 2,
        category: "test",
        message: "before ingest",
        level: "info",
      },
    ],
    extra: { liveIngest: true, schema: "log-event / error-event" },
  };
}

export function buildFullLiveLog(time: number): DuckBugLogEvent {
  return {
    ...liveIngestSharedMetadata(time),
    time,
    level: logLevel.WARN,
    message:
      "@duckbug/js live ingest — full log payload (all optional contract fields + dTags)",
    dTags: [...LIVE_TAG_BASE, "log", "warn-level"],
  };
}

export function buildFullLiveError(time: number): DuckBugErrorEvent {
  return {
    ...liveIngestSharedMetadata(time),
    time,
    message:
      "@duckbug/js live ingest — full error payload (all optional contract fields + dTags)",
    stacktrace: [
      {
        file: "tests/duckbugLiveIngestEnv.ingest.ts",
        line: 1,
        function: "buildFullLiveError",
      },
      {
        file: "src/DuckBug/DuckBugProvider.ts",
        line: 51,
        function: "sendError",
      },
    ],
    file: "tests/duckbugLiveIngestEnv.ingest.ts",
    line: 1,
    stacktraceAsString:
      "Error: live ingest synthetic\n    at buildFullLiveError (tests/duckbugLiveIngestEnv.ingest.ts:1:1)\n    at sendError (src/DuckBug/DuckBugProvider.ts:51:1)",
    exception: {
      type: "Error",
      message: "live ingest synthetic error",
    },
    handled: true,
    mechanism: "live-ingest-test",
    dTags: [...LIVE_TAG_BASE, "error", "handled"],
  };
}
