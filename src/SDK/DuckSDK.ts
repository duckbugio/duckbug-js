import type {
  DuckBugErrorEvent,
  DuckBugLogEvent,
  IngestSharedMetadata,
} from "../contract";
import type {
  BeforeSendIngestArg,
  BeforeSendIngestResult,
} from "../DuckBug/DuckBugConfig";
import { processError } from "../DuckBug/DuckBugHelper";
import { finalizeIngestEvent } from "../DuckBug/finalizeIngestEvent";
import type { StrippableIngestSection } from "../DuckBug/stripIngestSections";
import { SDK_IDENTITY } from "../sdkIdentity";
import { type DuckLogPayload, parseDuckLogPayload } from "./duckLogPayload";
import type { LogLevel } from "./LogLevel";
import { logLevel } from "./LogLevel";
import { LogProvider } from "./LogProvider";
import type { LogProviderConfig } from "./LogProviderConfig";
import type { Provider } from "./Provider";

export type DuckSDKOptions = {
  beforeSend?: (
    arg: BeforeSendIngestArg,
  ) => BeforeSendIngestResult | Promise<BeforeSendIngestResult>;
  extraSensitiveKeys?: string[];
  stripSections?: StrippableIngestSection[];
};

function isPromiseLike<T>(v: unknown): v is PromiseLike<T> {
  return (
    v !== null &&
    typeof v === "object" &&
    "then" in v &&
    typeof (v as PromiseLike<T>).then === "function"
  );
}

export class DuckSDK {
  private providers: Array<Provider>;
  private scope: Partial<IngestSharedMetadata> = {};
  private readonly beforeSendHook?: DuckSDKOptions["beforeSend"];
  private readonly extraSensitiveKeys?: string[];
  private readonly stripSections?: StrippableIngestSection[];

  constructor(
    providers: Array<Provider>,
    logProviderConfig?: LogProviderConfig,
    options?: DuckSDKOptions,
  ) {
    this.providers = providers;
    this.beforeSendHook = options?.beforeSend;
    this.extraSensitiveKeys = options?.extraSensitiveKeys;
    this.stripSections = options?.stripSections;
    new LogProvider(providers, logProviderConfig);
  }

  /** Merge default scope metadata into every captured event. */
  setScope(scope: Partial<IngestSharedMetadata>): void {
    this.scope = { ...this.scope, ...scope };
  }

  /**
   * Wait until queued ingest work finishes for providers that expose `flush`
   * (e.g. {@link DuckBugProvider}).
   */
  flush(): Promise<void> {
    return Promise.all(
      this.providers.map((p) => {
        const f = (p as { flush?: () => void | Promise<void> }).flush;
        return f ? Promise.resolve(f.call(p)) : Promise.resolve();
      }),
    ).then(() => undefined);
  }

  log(tag: string, payload?: DuckLogPayload) {
    this.emitLog(logLevel.DEBUG, tag, payload);
  }

  error(tag: string, payload?: DuckLogPayload) {
    this.emitLog(logLevel.ERROR, tag, payload);
  }

  debug(tag: string, payload?: DuckLogPayload) {
    this.emitLog(logLevel.DEBUG, tag, payload);
  }

  warn(tag: string, payload?: DuckLogPayload) {
    this.emitLog(logLevel.WARN, tag, payload);
  }

  fatal(tag: string, payload?: DuckLogPayload) {
    this.emitLog(logLevel.FATAL, tag, payload);
  }

  quack(tag: string, error: Error) {
    const time = Date.now();
    const built = processError(error, tag, time);
    const merged = this.mergeScope(built);
    const finalized = finalizeIngestEvent(merged, {
      extraSensitiveKeys: this.extraSensitiveKeys,
      stripSections: this.stripSections,
    });
    if (!this.beforeSendHook) {
      for (const p of this.providers) {
        p.sendError(finalized, { skipPrivacyPipeline: true });
      }
      return;
    }
    const arg = { kind: "error" as const, event: finalized };
    const out = this.beforeSendHook(arg);
    if (isPromiseLike(out)) {
      void out.then((resolved) => {
        const after = this.normalizeBeforeSendError(resolved, finalized);
        if (after === null) {
          return;
        }
        for (const p of this.providers) {
          p.sendError(after, { skipPrivacyPipeline: true });
        }
      });
      return;
    }
    const after = this.normalizeBeforeSendError(out, finalized);
    if (after === null) {
      return;
    }
    for (const p of this.providers) {
      p.sendError(after, { skipPrivacyPipeline: true });
    }
  }

  private normalizeBeforeSendLog(
    out: BeforeSendIngestResult,
    fallback: DuckBugLogEvent,
  ): DuckBugLogEvent | null {
    if (out === null) {
      return null;
    }
    if (out === undefined) {
      return fallback;
    }
    return out as DuckBugLogEvent;
  }

  private normalizeBeforeSendError(
    out: BeforeSendIngestResult,
    fallback: DuckBugErrorEvent,
  ): DuckBugErrorEvent | null {
    if (out === null) {
      return null;
    }
    if (out === undefined) {
      return fallback;
    }
    return out as DuckBugErrorEvent;
  }

  private emitLog(level: LogLevel, message: string, payload?: DuckLogPayload) {
    const { scopePatch, context, dTags } = parseDuckLogPayload(payload);
    const platform =
      scopePatch.platform !== undefined &&
      typeof scopePatch.platform === "string"
        ? scopePatch.platform
        : "node";
    const scopeForSpread = { ...scopePatch } as Record<string, unknown>;
    delete scopeForSpread.platform;

    const event: DuckBugLogEvent = this.mergeScope({
      ...scopeForSpread,
      time: Date.now(),
      level,
      message,
      platform,
      sdk: { ...SDK_IDENTITY },
      ...(dTags !== undefined ? { dTags } : {}),
      ...(context !== undefined ? { context } : {}),
    } as DuckBugLogEvent);
    const finalized = finalizeIngestEvent(event, {
      extraSensitiveKeys: this.extraSensitiveKeys,
      stripSections: this.stripSections,
    });
    if (!this.beforeSendHook) {
      for (const p of this.providers) {
        p.sendLog(finalized, { skipPrivacyPipeline: true });
      }
      return;
    }
    const arg = { kind: "log" as const, event: finalized };
    const out = this.beforeSendHook(arg);
    if (isPromiseLike(out)) {
      void out.then((resolved) => {
        const after = this.normalizeBeforeSendLog(resolved, finalized);
        if (after === null) {
          return;
        }
        for (const p of this.providers) {
          p.sendLog(after, { skipPrivacyPipeline: true });
        }
      });
      return;
    }
    const after = this.normalizeBeforeSendLog(out, finalized);
    if (after === null) {
      return;
    }
    for (const p of this.providers) {
      p.sendLog(after, { skipPrivacyPipeline: true });
    }
  }

  private mergeScope<E extends DuckBugLogEvent | DuckBugErrorEvent>(
    event: E,
  ): E {
    return { ...this.scope, ...event } as E;
  }
}

/** Branded facade per duckbug-sdk-spec naming doctrine. */
export class Duck extends DuckSDK {
  captureException(error: Error, tag?: string): void {
    this.quack(tag ?? "error", error);
  }
}
