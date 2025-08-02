import type { LogLevel } from "./LogLevel";

export interface Provider {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  report(tag: string, level: LogLevel, payload?: object): void;
  quack(tag: string, error: Error): void;
}
