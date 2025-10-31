import type { LogLevel, LogProviderConfig, Provider } from ".";
import { LogProvider, logLevel } from ".";

export class DuckSDK {
  private providers;

  constructor(
    providers: Array<Provider>,
    logProviderConfig?: LogProviderConfig,
  ) {
    this.providers = providers;
    new LogProvider(providers, logProviderConfig);
  }

  log(tag: string, payload?: object) {
    this.sendReportToPlugins(tag, logLevel.DEBUG, payload);
  }

  error(tag: string, payload?: object) {
    this.sendReportToPlugins(tag, logLevel.DEBUG, payload);
  }

  debug(tag: string, payload?: object) {
    this.sendReportToPlugins(tag, logLevel.DEBUG, payload);
  }

  warn(tag: string, payload?: object) {
    this.sendReportToPlugins(tag, logLevel.WARN, payload);
  }

  fatal(tag: string, payload?: object) {
    this.sendReportToPlugins(tag, logLevel.FATAL, payload);
  }

  quack(tag: string, error: Error) {
    this.providers.forEach((plugin) => plugin.quack(tag, error));
  }

  private sendReportToPlugins(tag: string, level: LogLevel, payload?: object) {
    this.providers.forEach((plugin) => plugin.report(tag, level, payload));
  }
}
