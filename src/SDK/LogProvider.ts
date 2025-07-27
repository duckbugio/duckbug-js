import type { LogProviderConfig } from "./LogProviderConfig";
import type { Provider } from "./Provider";

export class LogProvider {
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };
  private providers: Array<Provider>;
  private logProviderConfig: LogProviderConfig = {
    logReports: {
      log: false,
      warn: true,
      error: true,
    },
  };

  constructor(
    providers: Array<Provider>,
    logProviderConfig: LogProviderConfig = this.logProviderConfig,
  ) {
    this.logProviderConfig = logProviderConfig;
    this.providers = providers;
    this.initialize();
  }

  initialize() {
    if (this.logProviderConfig.logReports.log) {
      this.overrideLog();
    }
    if (this.logProviderConfig.logReports.warn) {
      this.overrideWarn();
    }
    if (this.logProviderConfig.logReports.error) {
      this.overrideError();
    }
  }

  private overrideError() {
    console.error = (...args: unknown[]) => {
      this.originalConsole.error.apply(console, args);

      this.callPlugins((plugin) => {
        plugin.error(args);
      });
    };
  }

  private overrideLog() {
    console.log = (...args: unknown[]) => {
      this.originalConsole.log.apply(console, args);

      this.callPlugins((plugin) => {
        plugin.log(args);
      });
    };
  }

  private overrideWarn() {
    console.warn = (...args: unknown[]) => {
      this.originalConsole.warn.apply(console, args);

      this.callPlugins((plugin) => {
        plugin.warn(args);
      });
    };
  }

  private callPlugins(callback: (plugin: Provider) => void) {
    this.providers.forEach((plugin) => {
      callback(plugin);
    });
  }
}
