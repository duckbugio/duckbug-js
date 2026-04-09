import type { DuckBugErrorEvent, DuckBugLogEvent } from "../contract";

/** Top-level ingest fields that may be omitted before send (duckbug-sdk-spec privacy). */
export type StrippableIngestSection =
  | "ip"
  | "url"
  | "method"
  | "headers"
  | "queryParams"
  | "bodyParams"
  | "cookies"
  | "session"
  | "files"
  | "env";

export function stripIngestSections<
  E extends DuckBugLogEvent | DuckBugErrorEvent,
>(event: E, sections: StrippableIngestSection[] | undefined): E {
  if (sections === undefined || sections.length === 0) {
    return event;
  }
  const o = { ...event } as Record<string, unknown>;
  for (const s of sections) {
    delete o[s];
  }
  return o as E;
}
