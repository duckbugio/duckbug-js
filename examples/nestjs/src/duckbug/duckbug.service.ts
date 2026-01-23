import { DuckBugProvider, DuckSDK } from "@duckbug/js";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DuckBugService {
  private readonly duck: DuckSDK;

  constructor() {
    const dsn = process.env.DUCKBUG_DSN || "";

    if (!dsn) {
      console.warn("DUCKBUG_DSN is not set. DuckBug logging will not work.");
    }

    const providers = [
      new DuckBugProvider({
        dsn,
      }),
    ];

    this.duck = new DuckSDK(providers, {
      logReports: {
        log: true,
        warn: true,
        error: true,
      },
    });
  }

  log(tag: string, payload?: object) {
    this.duck.log(tag, payload);
  }

  debug(tag: string, payload?: object) {
    this.duck.debug(tag, payload);
  }

  warn(tag: string, payload?: object) {
    this.duck.warn(tag, payload);
  }

  error(tag: string, payload?: object) {
    this.duck.error(tag, payload);
  }

  fatal(tag: string, payload?: object) {
    this.duck.fatal(tag, payload);
  }

  quack(tag: string, error: Error) {
    this.duck.quack(tag, error);
  }
}
