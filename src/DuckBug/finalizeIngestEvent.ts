import type { DuckBugErrorEvent, DuckBugLogEvent } from "../contract";
import { SDK_IDENTITY } from "../sdkIdentity";
import { ensureEventId } from "./ensureEventId";
import { sanitizeIngestPayload } from "./sanitizeIngestPayload";
import {
  type StrippableIngestSection,
  stripIngestSections,
} from "./stripIngestSections";

export type FinalizeIngestOptions = {
  extraSensitiveKeys?: string[];
  stripSections?: StrippableIngestSection[];
};

function withDefaultSdk<E extends DuckBugLogEvent | DuckBugErrorEvent>(
  event: E,
): E {
  if (event.sdk !== undefined) {
    return event;
  }
  return { ...event, sdk: { ...SDK_IDENTITY } } as E;
}

/**
 * default sdk → strip → sanitize → eventId (duckbug-sdk-spec pipeline before beforeSend).
 */
export function finalizeIngestEvent(
  event: DuckBugLogEvent,
  options?: FinalizeIngestOptions,
): DuckBugLogEvent;
export function finalizeIngestEvent(
  event: DuckBugErrorEvent,
  options?: FinalizeIngestOptions,
): DuckBugErrorEvent;
export function finalizeIngestEvent(
  event: DuckBugLogEvent | DuckBugErrorEvent,
  options: FinalizeIngestOptions = {},
): DuckBugLogEvent | DuckBugErrorEvent {
  const withSdk = withDefaultSdk(event);
  const stripped = stripIngestSections(withSdk, options.stripSections);
  const sanitized = sanitizeIngestPayload(
    stripped,
    options.extraSensitiveKeys,
  ) as DuckBugLogEvent | DuckBugErrorEvent;
  return ensureEventId(sanitized);
}
