import type { Provider } from "../Provider";
import type { LogProviderConfig } from "./LogProviderConfig";

export class LogProvider {
  #originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };
  #plugins: Array<Provider>;
  #logProviderConfig: LogProviderConfig = {
    logReports: {
      log: false,
      warn: true,
      error: true,
    },
  };

  constructor(
    plugins: Array<Provider>,
    logProviderConfig: LogProviderConfig = this.#logProviderConfig,
  ) {
    this.#logProviderConfig = logProviderConfig;
    this.#plugins = plugins;
    this.#initialize();
  }

  #initialize() {
    if (this.#logProviderConfig.logReports.log) {
      this.#overrideLog();
    }
    if (this.#logProviderConfig.logReports.warn) {
      this.#overrideWarn();
    }
    if (this.#logProviderConfig.logReports.error) {
      this.#overrideError();
    }
  }

  #overrideError() {
    console.error = (...args: unknown[]) => {
      this.#originalConsole.error.apply(console, args);

      this.#callPlugins((plugin) => {
        plugin.error(args);
      });
    };
  }

  #overrideLog() {
    console.log = (...args: unknown[]) => {
      this.#originalConsole.log.apply(console, args);

      this.#callPlugins((plugin) => {
        plugin.log(args);
      });
    };
  }

  #overrideWarn() {
    console.warn = (...args: unknown[]) => {
      this.#originalConsole.warn.apply(console, args);

      this.#callPlugins((plugin) => {
        plugin.warn(args);
      });
    };
  }

  #callPlugins(callback: (plugin: Provider) => void) {
    this.#plugins.forEach((plugin) => {
      callback(plugin);
    });
  }
}
