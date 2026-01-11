import type { DuckBugConfig } from "./DuckBugConfig";
import type { Log } from "./Log";

export type StacktraceFrame = {
  index: number;
  content: string;
};

export type Stacktrace = {
  raw: string;
  frames: StacktraceFrame[];
};

export type ErrorRequest = {
  time: number;
  message: string;
  stacktrace: Stacktrace;
  file: string;
  line: number;
  context?: unknown;
};

export class DuckBugService {
  constructor(private config: DuckBugConfig) {}

  sendLog(logInfo: Log) {
    fetch(`${this.config.dsn}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logInfo),
    });
  }

  sendError(errorRequest: ErrorRequest) {
    fetch(`${this.config.dsn}/errors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorRequest),
    });
  }
}
