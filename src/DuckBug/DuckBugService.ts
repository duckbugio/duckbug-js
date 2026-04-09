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

function isRetriableHttpStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
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

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
      attempts: maxAttempts,
      error: lastErr,
      message,
    });
  }
}
