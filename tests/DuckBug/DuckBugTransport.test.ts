import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { DuckBugConfig } from "../../src/DuckBug/DuckBugConfig";
import { DuckBugService } from "../../src/DuckBug/DuckBugService";
import { logLevel } from "../../src/SDK/LogLevel";

const DSN = "https://api.test/ingest/p:k";
const LOGS_BATCH = "https://api.test/ingest/p:k/logs/batch";

describe("DuckBugService batch and retry", () => {
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() => Promise.resolve(new Response("", { status: 201 })));
  });

  it("posts JSON array to logs batch when maxBatchSize>1", async () => {
    const config: DuckBugConfig = {
      dsn: DSN,
      transport: {
        maxBatchSize: 2,
        maxRetries: 0,
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    };
    const svc = new DuckBugService(config);
    svc.sendLog({ time: 1, level: logLevel.INFO, message: "a" });
    svc.sendLog({ time: 2, level: logLevel.INFO, message: "b" });
    await svc.flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(LOGS_BATCH);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toHaveLength(2);
  });

  it("reuses same eventId across retried single-log requests", async () => {
    let n = 0;
    fetchMock.mockImplementation(() => {
      n++;
      if (n === 1) {
        return Promise.resolve(new Response("", { status: 503 }));
      }
      return Promise.resolve(new Response("", { status: 201 }));
    });
    const config: DuckBugConfig = {
      dsn: DSN,
      transport: {
        maxBatchSize: 1,
        maxRetries: 2,
        retryDelayMs: 1,
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    };
    const svc = new DuckBugService(config);
    const ev = {
      time: 1,
      level: logLevel.INFO,
      message: "x",
      eventId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
    };
    svc.sendLog(ev);
    await svc.flush();
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    const first = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(first.eventId).toBe(ev.eventId);
    expect(second.eventId).toBe(ev.eventId);
  });
});
