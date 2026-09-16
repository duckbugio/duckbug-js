import type { DuckBugErrorEvent, DuckBugLogEvent } from "../contract";
import type { DuckBugConfig } from "./DuckBugConfig";
import {
  ingestErrorsBatchUrl,
  ingestErrorsUrl,
  ingestLogsBatchUrl,
  ingestLogsUrl,
  parseDuckBugIngestDsn,
} from "./parseDuckBugDsn";
import type { TransportFailureInfo } from "./transportTypes";

/** @deprecated Use {@link DuckBugErrorEvent} from the public contract types. */
export type ErrorRequest = DuckBugErrorEvent;

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 200;
const MAX_BACKEND_BATCH = 1000;

const STATUS_REQUEST_TIMEOUT = 408;
const STATUS_TOO_MANY_REQUESTS = 429;
const STATUS_SERVER_ERROR_MIN = 500;
const STATUS_NOT_IMPLEMENTED = 501;

/**
 * Tells whether sending the very same request again can plausibly end
 * differently. This predicate is the shared one: duckbug-go and duckbug-php
 * answer exactly the same question the same way, and a change here has to land
 * in all three.
 *
 * The rule is "transient unless proven final": 408, 429 and every 5xx are worth
 * another attempt; 501 is the single carve-out; everything else is the final
 * answer. A request that never produced a response is handled by the caller
 * below, outside this function.
 *
 * It is written as a rule with one hole rather than as a list of retriable
 * codes on purpose. This SDK does not only talk to DuckBug's ingest - a DuckBug
 * installation sits behind whatever edge the customer runs, and that edge
 * invents statuses of its own. An allow list turns every code it has not been
 * taught about into a silently dropped event, which is the one failure an error
 * tracker must not have, and widening it means shipping a new SDK into every
 * consumer's dependency tree. Being wrong the other way costs at most
 * `maxRetries` extra requests with bounded backoff, and the backend treats
 * `eventId` as the idempotency key, so a retry of a request that did arrive
 * cannot create a second event.
 *
 * 408 is retried because it is the edge timing out the request body (nginx
 * client_body_timeout and friends), never a verdict on the payload; RFC 9110
 * states outright that such a request may be repeated unchanged.
 *
 * 501 is the hole: it is DuckBug stating that the capability is not configured
 * in this installation, and only an operator can change that. The backend
 * reaches for 501 over 503 in exactly that case so clients stop retrying,
 * because 503 would promise that waiting helps. A 501 from an intermediary
 * means the same thing one layer out, so the answer is the same either way.
 *
 * Do not widen this carve-out to 503. On the ingest path a 503 is the edge
 * during a redeploy - the transient case this predicate exists for.
 *
 * Deliberate differences from the other two SDKs:
 *   - a request that never reached a response is a rejected `fetch` promise
 *     with no status at all, so it cannot be expressed here; the loop below
 *     retries it in its `catch`. duckbug-go sees the same case as an error from
 *     `http.Client.Do` and duckbug-php as a cURL errno.
 *   - 409 never reaches this function: `ingestResponseAccepted` folds it into
 *     success, because a duplicate `eventId` means the event is already stored.
 *     duckbug-go and duckbug-php surface 409 to the caller instead, and reach
 *     the same retry answer - no retry - by a different route.
 *
 * The 429 that DuckBug's rate limiter returns carries `Retry-After`, which this
 * transport does not read - the backoff below decides on its own. Honouring it
 * is a separate change and has to land in all three SDKs together.
 */
function isRetriableHttpStatus(status: number): boolean {
  if (status === STATUS_NOT_IMPLEMENTED) {
    return false;
  }
  if (
    status === STATUS_REQUEST_TIMEOUT ||
    status === STATUS_TOO_MANY_REQUESTS
  ) {
    return true;
  }
  return status >= STATUS_SERVER_ERROR_MIN;
}

function ingestResponseAccepted(status: number): boolean {
  return (status >= 200 && status < 300) || status === 409;
}

export class DuckBugService {
  private readonly logsUrl: string;
  private readonly errorsUrl: string;
  private readonly logsBatchUrl: string;
  private readonly errorsBatchUrl: string;
  private readonly maxBatchSize: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onTransportError?: DuckBugConfig["onTransportError"];

  private readonly logQueue: DuckBugLogEvent[] = [];
  private readonly errorQueue: DuckBugErrorEvent[] = [];

  private logChain: Promise<void> = Promise.resolve();
  private errorChain: Promise<void> = Promise.resolve();

  constructor(config: DuckBugConfig) {
    const parsed = parseDuckBugIngestDsn(config.dsn);
    this.logsUrl = ingestLogsUrl(parsed);
    this.errorsUrl = ingestErrorsUrl(parsed);
    this.logsBatchUrl = ingestLogsBatchUrl(parsed);
    this.errorsBatchUrl = ingestErrorsBatchUrl(parsed);
    this.maxBatchSize = config.transport?.maxBatchSize ?? 1;
    this.maxRetries = config.transport?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs =
      config.transport?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.fetchImpl =
      config.transport?.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.onTransportError = config.onTransportError;
  }

  sendLog(logInfo: DuckBugLogEvent): void {
    void this.enqueueLogTransport(async () => {
      this.logQueue.push(logInfo);
      await this.pumpLogsAfterEnqueue();
    });
  }

  sendError(errorRequest: DuckBugErrorEvent): void {
    void this.enqueueErrorTransport(async () => {
      this.errorQueue.push(errorRequest);
      await this.pumpErrorsAfterEnqueue();
    });
  }

  /** Drains queued events for both logs and errors. Safe to call multiple times. */
  flush(): Promise<void> {
    return Promise.all([this.flushLogs(), this.flushErrors()]).then(() => {
      return undefined;
    });
  }

  private flushLogs(): Promise<void> {
    return this.enqueueLogTransport(async () => {
      while (this.logQueue.length > 0) {
        await this.drainLogStep();
      }
    });
  }

  private flushErrors(): Promise<void> {
    return this.enqueueErrorTransport(async () => {
      while (this.errorQueue.length > 0) {
        await this.drainErrorStep();
      }
    });
  }

  private enqueueLogTransport(fn: () => Promise<void>): Promise<void> {
    const p = this.logChain.then(() => fn());
    this.logChain = p.then(
      () => undefined,
      () => undefined,
    );
    return p;
  }

  private enqueueErrorTransport(fn: () => Promise<void>): Promise<void> {
    const p = this.errorChain.then(() => fn());
    this.errorChain = p.then(
      () => undefined,
      () => undefined,
    );
    return p;
  }

  private async pumpLogsAfterEnqueue(): Promise<void> {
    if (this.maxBatchSize <= 1) {
      const item = this.logQueue.shift();
      if (item) {
        await this.postJsonWithRetry(this.logsUrl, item, "log", 1);
      }
      return;
    }
    if (this.logQueue.length >= this.maxBatchSize) {
      const n = Math.min(
        this.maxBatchSize,
        MAX_BACKEND_BATCH,
        this.logQueue.length,
      );
      const batch = this.logQueue.splice(0, n);
      await this.postJsonWithRetry(
        this.logsBatchUrl,
        batch,
        "log",
        batch.length,
      );
    }
  }

  private async pumpErrorsAfterEnqueue(): Promise<void> {
    if (this.maxBatchSize <= 1) {
      const item = this.errorQueue.shift();
      if (item) {
        await this.postJsonWithRetry(this.errorsUrl, item, "error", 1);
      }
      return;
    }
    if (this.errorQueue.length >= this.maxBatchSize) {
      const n = Math.min(
        this.maxBatchSize,
        MAX_BACKEND_BATCH,
        this.errorQueue.length,
      );
      const batch = this.errorQueue.splice(0, n);
      await this.postJsonWithRetry(
        this.errorsBatchUrl,
        batch,
        "error",
        batch.length,
      );
    }
  }

  private async drainLogStep(): Promise<void> {
    if (this.maxBatchSize <= 1) {
      const item = this.logQueue.shift();
      if (item) {
        await this.postJsonWithRetry(this.logsUrl, item, "log", 1);
      }
      return;
    }
    const n = Math.min(
      this.maxBatchSize,
      MAX_BACKEND_BATCH,
      this.logQueue.length,
    );
    if (n === 0) {
      return;
    }
    const batch = this.logQueue.splice(0, n);
    await this.postJsonWithRetry(this.logsBatchUrl, batch, "log", batch.length);
  }

  private async drainErrorStep(): Promise<void> {
    if (this.maxBatchSize <= 1) {
      const item = this.errorQueue.shift();
      if (item) {
        await this.postJsonWithRetry(this.errorsUrl, item, "error", 1);
      }
      return;
    }
    const n = Math.min(
      this.maxBatchSize,
      MAX_BACKEND_BATCH,
      this.errorQueue.length,
    );
    if (n === 0) {
      return;
    }
    const batch = this.errorQueue.splice(0, n);
    await this.postJsonWithRetry(
      this.errorsBatchUrl,
      batch,
      "error",
      batch.length,
    );
  }

  private emitFailure(info: TransportFailureInfo): void {
    this.onTransportError?.(info);
  }

  private async postJsonWithRetry(
    url: string,
    body: unknown,
    kind: "log" | "error",
    itemCount: number,
  ): Promise<void> {
    let lastErr: unknown = new Error("unknown transport failure");
    const maxAttempts = this.maxRetries + 1;
    // What the caller is told in `TransportFailureInfo.attempts` has to be what
    // actually happened, not the budget: a terminal status stops the loop after
    // one request, and reporting `maxAttempts` there would invent two retries
    // that never ran. duckbug-go and duckbug-php both report the real count.
    let attemptsMade = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attemptsMade = attempt + 1;
      try {
        const res = await this.fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (ingestResponseAccepted(res.status)) {
          return;
        }

        let detail = "";
        try {
          const t = await res.text();
          const trimmed = t.trim();
          if (trimmed) {
            const max = 400;
            detail =
              trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
          }
        } catch {
          /* ignore body read errors */
        }
        lastErr = new Error(
          detail
            ? `ingest HTTP ${res.status}: ${detail}`
            : `ingest HTTP ${res.status}`,
        );
        if (!isRetriableHttpStatus(res.status)) {
          break;
        }
      } catch (e) {
        lastErr = e;
      }

      if (attempt < maxAttempts - 1) {
        const delay = this.retryDelayMs * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    const message =
      lastErr instanceof Error ? lastErr.message : String(lastErr);
    this.emitFailure({
      kind,
      itemCount,
      attempts: attemptsMade,
      error: lastErr,
      message,
    });
  }
}
