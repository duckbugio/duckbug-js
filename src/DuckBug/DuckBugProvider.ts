import { type LogLevel, logLevel, type Provider } from "../SDK";
import type { DuckBugConfig } from "./DuckBugConfig";
import { DuckBugService } from "./DuckBugService";

export class DuckBugProvider implements Provider {
  service: DuckBugService;

  constructor(config: DuckBugConfig) {
    this.service = new DuckBugService(config);
  }

  warn(...args: unknown[]): void {
    this.service.sendLog({
      time: this.getTimeStamp(),
      level: logLevel.WARN,
      message: this.convertArgsToString(args[0]),
      context: args.slice(1),
    });
  }

  error(...args: unknown[]): void {
    this.service.sendLog({
      time: this.getTimeStamp(),
      level: logLevel.ERROR,
      message: this.convertArgsToString(args[0]),
      context: args.slice(1),
    });
  }

  log(...args: unknown[]): void {
    this.service.sendLog({
      time: this.getTimeStamp(),
      level: logLevel.INFO,
      message: this.convertArgsToString(args[0]),
      context: args.slice(1),
    });
  }

  report(tag: string, level: LogLevel, payload?: object): void {
    this.service.sendLog({
      time: this.getTimeStamp(),
      level,
      message: tag,
      context: payload,
    });
  }

  quack(tag: string, error: Error): void {
    this.service.sendError({
      stack: error.stack,
      message: tag,
      context: error.message,
    });
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
