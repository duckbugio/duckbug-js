import type { LogLevel } from "../Log";

export interface Provider {
	log(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	error(...args: unknown[]): void;
	report(tag: string, level: LogLevel, payload?: object): void;
}
