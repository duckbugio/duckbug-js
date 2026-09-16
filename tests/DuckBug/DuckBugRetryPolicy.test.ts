import { describe, expect, it } from "bun:test";
import type { DuckBugConfig } from "../../src/DuckBug/DuckBugConfig";
import { DuckBugService } from "../../src/DuckBug/DuckBugService";
import type { TransportFailureInfo } from "../../src/DuckBug/transportTypes";
import { logLevel } from "../../src/SDK/LogLevel";

const DSN = "https://api.test/ingest/p:k";
const MAX_RETRIES = 2;

/**
 * The retry predicate lives inside the module, so it is pinned here through the
 * only thing a consumer can observe: how many times the transport actually
 * posts, and what it reports when it gives up.
 */
async function attemptsFor(
  status: number,
): Promise<{ requests: number; failure: TransportFailureInfo | undefined }> {
  let requests = 0;
  let failure: TransportFailureInfo | undefined;

  const fetchImpl = (() => {
    requests++;
    return Promise.resolve(new Response("", { status }));
  }) as unknown as typeof fetch;

  const config: DuckBugConfig = {
    dsn: DSN,
    transport: {
      maxBatchSize: 1,
      maxRetries: MAX_RETRIES,
      retryDelayMs: 1,
      fetchImpl,
    },
    onTransportError: (info) => {
      failure = info;
    },
  };

  const svc = new DuckBugService(config);
  svc.sendLog({ time: 1, level: logLevel.INFO, message: "x" });
  await svc.flush();

  return { requests, failure };
}

describe("DuckBugService retry policy", () => {
  it("retries a request timeout", async () => {
    // 408 is the edge timing out the request body, not a verdict on the
    // payload; RFC 9110 states such a request may be repeated unchanged.
    const { requests } = await attemptsFor(408);
    expect(requests).toBe(MAX_RETRIES + 1);
  });

  it("retries throttling", async () => {
    const { requests } = await attemptsFor(429);
    expect(requests).toBe(MAX_RETRIES + 1);
  });

  it("retries known transient server faults", async () => {
    for (const status of [500, 502, 503, 504]) {
      const { requests } = await attemptsFor(status);
      expect(requests).toBe(MAX_RETRIES + 1);
    }
  });

  it("retries server faults it has never been taught about", async () => {
    // These are what an edge in front of a DuckBug installation invents. An
    // allow list would drop the event on the first one, silently.
    for (const status of [505, 507, 508, 510, 521, 599]) {
      const { requests } = await attemptsFor(status);
      expect(requests).toBe(MAX_RETRIES + 1);
    }
  });

  it("treats not implemented as final", async () => {
    // 501 means the capability is not configured in this installation, so
    // repeating cannot change it.
    const { requests } = await attemptsFor(501);
    expect(requests).toBe(1);
  });

  it("treats verdicts on this request as final", async () => {
    for (const status of [400, 401, 403, 404, 413, 415, 422]) {
      const { requests } = await attemptsFor(status);
      expect(requests).toBe(1);
    }
  });

  it("reports how many attempts were actually made", async () => {
    const terminal = await attemptsFor(400);
    expect(terminal.failure?.attempts).toBe(1);

    const retried = await attemptsFor(503);
    expect(retried.failure?.attempts).toBe(MAX_RETRIES + 1);
  });

  it("retries a request that never produced a response", async () => {
    // In this runtime a request that never reached the server is a rejected
    // promise with no status at all - duckbug-go sees an error from
    // http.Client.Do and duckbug-php a cURL errno. All three retry it.
    let requests = 0;
    const fetchImpl = (() => {
      requests++;
      return Promise.reject(new TypeError("fetch failed"));
    }) as unknown as typeof fetch;

    const svc = new DuckBugService({
      dsn: DSN,
      transport: {
        maxBatchSize: 1,
        maxRetries: MAX_RETRIES,
        retryDelayMs: 1,
        fetchImpl,
      },
    });
    svc.sendLog({ time: 1, level: logLevel.INFO, message: "x" });
    await svc.flush();

    expect(requests).toBe(MAX_RETRIES + 1);
  });
});
