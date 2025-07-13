import type { Log, LogLevel } from "../Log";
import { logLevel } from "../Log";
import type { Provider } from "../Provider";
import type { DuckConfig } from "../SDK";

export class DuckBugProvider implements Provider {
  #config: DuckConfig;
  constructor(config: DuckConfig) {
    this.#config = config;
  }

  warn(...args: unknown[]): void {
    this.#sendLog({
      time: this.#getTimeStamp(),
      level: logLevel.WARN,
      message: this.#convertArgsToString(args[0]),
      context: this.#convertArgsToString(args.slice(1)),
    });
  }

  error(...args: unknown[]): void {
    this.#sendLog({
      time: this.#getTimeStamp(),
      level: logLevel.ERROR,
      message: this.#convertArgsToString(args[0]),
      context: this.#convertArgsToString(args.slice(1)),
    });
  }

  log(...args: unknown[]): void {
    this.#sendLog({
      time: this.#getTimeStamp(),
      level: logLevel.INFO,
      message: this.#convertArgsToString(args[0]),
      context: this.#convertArgsToString(args.slice(1)),
    });
  }

  report(tag: string, level: LogLevel, payload?: object): void {
    this.#sendLog({
      time: this.#getTimeStamp(),
      level,
      message: tag,
      context: JSON.stringify(payload),
    });
  }

  #convertArgsToString(...args: unknown[]): string {
    return args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg),
      )
      .join(" ");
  }

  #getTimeStamp(): number {
    return Date.now();
  }

  #sendLog(logInfo: Log) {
    fetch(`${this.#config.dsn}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logInfo),
    });
  }
}
