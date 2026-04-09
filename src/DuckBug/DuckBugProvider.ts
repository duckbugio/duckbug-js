import type {
  DuckBugErrorEvent,
  DuckBugLogEvent,
  IngestJsonValue,
} from "../contract";
import {
  type LogLevel,
  logLevel,
  type Provider,
  type SendEventMeta,
} from "../SDK";
import type { DuckBugConfig } from "./DuckBugConfig";
import { processError } from "./DuckBugHelper";
import { DuckBugService } from "./DuckBugService";
import { finalizeIngestEvent } from "./finalizeIngestEvent";

export class DuckBugProvider implements Provider {
  service: DuckBugService;
  private readonly ingestConfig: DuckBugConfig;

  constructor(config: DuckBugConfig) {
    this.ingestConfig = config;
    this.service = new DuckBugService(config);
  }

  static fromDSN(dsn: string): DuckBugProvider {
    return new DuckBugProvider({ dsn });
  }

  /** Drains the ingest transport queue; safe to call multiple times. */
  flush(): Promise<void> {
    return this.service.flush();
  }

  sendLog(event: DuckBugLogEvent, meta?: SendEventMeta): void {
    if (meta?.skipPrivacyPipeline) {
      this.service.sendLog(event);
      return;
    }
    if (this.ingestConfig.beforeSend) {
      void this.sendLogAsync(event, meta);
      return;
    }
    const prepared = finalizeIngestEvent(event, {
      extraSensitiveKeys: this.ingestConfig.extraSensitiveKeys,
      stripSections: this.ingestConfig.stripSections,
    });
    this.service.sendLog(prepared);
  }

  sendError(event: DuckBugErrorEvent, meta?: SendEventMeta): void {
    if (meta?.skipPrivacyPipeline) {
      this.service.sendError(event);
      return;
    }
    if (this.ingestConfig.beforeSend) {
      void this.sendErrorAsync(event, meta);
      return;
    }
    const prepared = finalizeIngestEvent(event, {
      extraSensitiveKeys: this.ingestConfig.extraSensitiveKeys,
      stripSections: this.ingestConfig.stripSections,
    });
    this.service.sendError(prepared);
  }

  private async sendLogAsync(
    event: DuckBugLogEvent,
    _meta?: SendEventMeta,
  ): Promise<void> {
    const prepared = finalizeIngestEvent(event, {
      extraSensitiveKeys: this.ingestConfig.extraSensitiveKeys,
      stripSections: this.ingestConfig.stripSections,
    });
    const r = await this.ingestConfig.beforeSend?.({
      kind: "log",
      event: prepared,
    });
    if (r === null) {
      return;
    }
    const toSend = (r ?? prepared) as DuckBugLogEvent;
    this.service.sendLog(toSend);
  }

  private async sendErrorAsync(
    event: DuckBugErrorEvent,
    _meta?: SendEventMeta,
  ): Promise<void> {
    const prepared = finalizeIngestEvent(event, {
      extraSensitiveKeys: this.ingestConfig.extraSensitiveKeys,
      stripSections: this.ingestConfig.stripSections,
    });
    const r = await this.ingestConfig.beforeSend?.({
      kind: "error",
      event: prepared,
    });
    if (r === null) {
      return;
    }
    const toSend = (r ?? prepared) as DuckBugErrorEvent;
    this.service.sendError(toSend);
  }

  warn(...args: unknown[]): void {
    this.sendLog({
      time: this.getTimeStamp(),
      level: logLevel.WARN,
      message: this.convertArgsToString(args[0]),
      ...this.normalizedContextPayload(args.slice(1)),
    });
  }

  error(...args: unknown[]): void {
    this.sendLog({
      time: this.getTimeStamp(),
      level: logLevel.ERROR,
      message: this.convertArgsToString(args[0]),
      ...this.normalizedContextPayload(args.slice(1)),
    });
  }

  log(...args: unknown[]): void {
    this.sendLog({
      time: this.getTimeStamp(),
      level: logLevel.INFO,
      message: this.convertArgsToString(args[0]),
      ...this.normalizedContextPayload(args.slice(1)),
    });
  }

  /** @deprecated Prefer {@link Duck} logging methods; kept for direct provider use. */
  report(tag: string, level: LogLevel, payload?: object): void {
    this.sendLog({
      time: this.getTimeStamp(),
      level,
      message: tag,
      ...(payload !== undefined ? { context: payload as IngestJsonValue } : {}),
    });
  }

  quack(tag: string, error: Error): void {
    const errorRequest = processError(error, tag, this.getTimeStamp());
    this.sendError(errorRequest);
  }

  private normalizedContextPayload(rest: unknown[]): {
    context?: DuckBugLogEvent["context"];
  } {
    if (rest.length === 0) {
      return {};
    }
    if (rest.length === 1) {
      const v = rest[0];
      return { context: v as IngestJsonValue };
    }
    return { context: { args: rest } as IngestJsonValue };
  }

  private convertArgsToString(...args: unknown[]): string {
    return args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg),
      )
      .join(" ");
  }

  private getTimeStamp(): number {
    return Date.now();
  }
}
