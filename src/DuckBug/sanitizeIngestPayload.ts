/** Default sensitive field names per duckbug-sdk-spec docs/03-privacy-and-delivery.md */
const DEFAULT_SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "secret",
]);

const MASK = "***";

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

function isSensitive(key: string, extra: Set<string>): boolean {
  const n = normalizeKey(key);
  if (DEFAULT_SENSITIVE_KEYS.has(n)) {
    return true;
  }
  for (const e of extra) {
    if (normalizeKey(e) === n) {
      return true;
    }
  }
  return false;
}

function cloneValue(
  value: unknown,
  extraSensitive: Set<string>,
  depth: number,
): unknown {
  if (depth > 20) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => cloneValue(v, extraSensitive, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitive(k, extraSensitive)) {
      out[k] = MASK;
    } else {
      out[k] = cloneValue(v, extraSensitive, depth + 1);
    }
  }
  return out;
}

/**
 * Deep-clones ingest-ready JSON and masks known sensitive keys (SDK-side best-effort).
 */
export function sanitizeIngestPayload<T>(
  payload: T,
  extraSensitiveKeys?: string[],
): T {
  const extra = new Set(extraSensitiveKeys ?? []);
  return cloneValue(
    JSON.parse(JSON.stringify(payload)) as unknown,
    extra,
    0,
  ) as T;
}
