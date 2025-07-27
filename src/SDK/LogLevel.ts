export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
export const logLevel: Record<LogLevel, LogLevel> = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  FATAL: "FATAL",
};
