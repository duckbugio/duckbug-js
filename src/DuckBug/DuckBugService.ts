import type { DuckBugConfig } from "./DuckBugConfig";
import type { Log } from "./Log";

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

  sendError(errorInfo: { message: string; stack?: string; context: string }) {
    fetch(`${this.config.dsn}/errors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorInfo),
    });
  }
}
