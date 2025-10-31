import type { LogLevel } from "../SDK/LogLevel";

export type Log = {
  message: string;
  level: LogLevel;
  time: number;
  context: object | undefined;
};
