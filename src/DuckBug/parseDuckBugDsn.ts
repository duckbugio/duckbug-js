export type ParsedIngestDsn = {
  origin: string;
  /** `/ingest` or `/api/ingest` (path only, no trailing slash). */
  ingestPathPrefix: string;
  projectId: string;
  key: string;
};

/**
 * Parses a DuckBug ingest DSN: `{origin}/ingest/{projectId}:{publicKey}` or
 * `{origin}/api/ingest/{projectId}:{publicKey}`.
 * @see duckbug-sdk-spec docs/03-privacy-and-delivery.md
 */
export function parseDuckBugIngestDsn(dsn: string): ParsedIngestDsn {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    throw new Error("Invalid DuckBug DSN: not a valid URL");
  }

  const match = url.pathname.match(/^((?:\/api)?\/ingest)\/([^/]+)$/);
  if (!match) {
    throw new Error(
      "Invalid DuckBug DSN: path must be /ingest/{projectId}:{publicKey} or /api/ingest/{projectId}:{publicKey}",
    );
  }

  const ingestPathPrefix = match[1];
  const segment = match[2];
  const colon = segment.indexOf(":");
  if (colon <= 0 || colon === segment.length - 1) {
    throw new Error(
      "Invalid DuckBug DSN: ingest segment must be projectId:publicKey",
    );
  }

  return {
    origin: url.origin,
    ingestPathPrefix,
    projectId: segment.slice(0, colon),
    key: segment.slice(colon + 1),
  };
}

function ingestBase(parsed: ParsedIngestDsn): string {
  return `${parsed.origin}${parsed.ingestPathPrefix}/${parsed.projectId}:${parsed.key}`;
}

export function ingestLogsUrl(parsed: ParsedIngestDsn): string {
  return `${ingestBase(parsed)}/logs`;
}

export function ingestErrorsUrl(parsed: ParsedIngestDsn): string {
  return `${ingestBase(parsed)}/errors`;
}

export function ingestLogsBatchUrl(parsed: ParsedIngestDsn): string {
  return `${ingestBase(parsed)}/logs/batch`;
}

export function ingestErrorsBatchUrl(parsed: ParsedIngestDsn): string {
  return `${ingestBase(parsed)}/errors/batch`;
}
