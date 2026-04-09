import { describe, expect, it } from "bun:test";
import {
  ingestErrorsUrl,
  ingestLogsUrl,
  parseDuckBugIngestDsn,
} from "../../src/DuckBug/parseDuckBugDsn";

describe("parseDuckBugIngestDsn", () => {
  it("parses /ingest/{projectId}:{key}", () => {
    const p = parseDuckBugIngestDsn("https://api.example/ingest/proj:pub");
    expect(p.ingestPathPrefix).toBe("/ingest");
    expect(p.projectId).toBe("proj");
    expect(p.key).toBe("pub");
    expect(ingestLogsUrl(p)).toBe("https://api.example/ingest/proj:pub/logs");
    expect(ingestErrorsUrl(p)).toBe(
      "https://api.example/ingest/proj:pub/errors",
    );
  });

  it("parses /api/ingest/{projectId}:{key}", () => {
    const p = parseDuckBugIngestDsn(
      "https://duckbug.io/api/ingest/11111111-1111-4111-8111-111111111111:abc",
    );
    expect(p.ingestPathPrefix).toBe("/api/ingest");
    expect(p.projectId).toBe("11111111-1111-4111-8111-111111111111");
    expect(p.key).toBe("abc");
    expect(ingestLogsUrl(p)).toBe(
      "https://duckbug.io/api/ingest/11111111-1111-4111-8111-111111111111:abc/logs",
    );
  });
});
