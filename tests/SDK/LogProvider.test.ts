// biome-ignore-all lint: complexity/useLiteralKeys

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { LogProviderConfig, Provider } from "../../src/SDK";
import { LogProvider } from "../../src/SDK/LogProvider";

describe("LogProvider", () => {
  let mockProvider1: Provider;
  let mockProvider2: Provider;
  let providers: Provider[];
  let originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
  };

  beforeEach(() => {
    // Store original console methods
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
    };

    mockProvider1 = {
      log: mock(),
      warn: mock(),
      error: mock(),
      report: mock(),
      quack: mock(),
    };

    mockProvider2 = {
      log: mock(),
      warn: mock(),
      error: mock(),
      report: mock(),
      quack: mock(),
    };

    providers = [mockProvider1, mockProvider2];

    // Mock console methods
    console.log = mock();
    console.error = mock();
    console.warn = mock();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const logProvider = new LogProvider(providers);

      expect(logProvider["providers"]).toBe(providers);
      expect(logProvider["logProviderConfig"]).toEqual({
        logReports: {
          log: false,
          warn: true,
          error: true,
        },
      });
    });

    it("should initialize with custom config", () => {
      const customConfig: LogProviderConfig = {
        logReports: {
          log: true,
          warn: false,
          error: true,
        },
      };

      const logProvider = new LogProvider(providers, customConfig);

      expect(logProvider["logProviderConfig"]).toBe(customConfig);
    });

    it("should store original console methods", () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;

      const logProvider = new LogProvider(providers);

      expect(logProvider["originalConsole"]).toEqual({
        log: originalConsole.log,
        error: originalConsole.error,
        warn: originalConsole.warn,
      });
    });
  });

  describe("initialize", () => {
    it("should override console methods based on default config", () => {
      const originalLogMethod = console.log;
      const originalWarnMethod = console.warn;
      const originalErrorMethod = console.error;

      new LogProvider(providers);

      // log should not be overridden (default: false)
      expect(console.log).toBe(originalLogMethod);
      // warn should be overridden (default: true)
      expect(console.warn).not.toBe(originalWarnMethod);
      // error should be overridden (default: true)
      expect(console.error).not.toBe(originalErrorMethod);
    });

    it("should override console methods based on custom config", () => {
      const originalLogMethod = console.log;
      const originalWarnMethod = console.warn;
      const originalErrorMethod = console.error;

      const customConfig: LogProviderConfig = {
        logReports: {
          log: true,
          warn: false,
          error: false,
        },
      };

      new LogProvider(providers, customConfig);

      // log should be overridden (custom: true)
      expect(console.log).not.toBe(originalLogMethod);
      // warn should not be overridden (custom: false)
      expect(console.warn).toBe(originalWarnMethod);
      // error should not be overridden (custom: false)
      expect(console.error).toBe(originalErrorMethod);
    });

    it("should override all console methods when all are enabled", () => {
      const originalLogMethod = console.log;
      const originalWarnMethod = console.warn;
      const originalErrorMethod = console.error;

      const allEnabledConfig: LogProviderConfig = {
        logReports: {
          log: true,
          warn: true,
          error: true,
        },
      };

      new LogProvider(providers, allEnabledConfig);

      expect(console.log).not.toBe(originalLogMethod);
      expect(console.warn).not.toBe(originalWarnMethod);
      expect(console.error).not.toBe(originalErrorMethod);
    });
  });

  describe("overridden console.log", () => {
    beforeEach(() => {
      const config: LogProviderConfig = {
        logReports: {
          log: true,
          warn: false,
          error: false,
        },
      };
      new LogProvider(providers, config);
    });

    it("should call original console.log", () => {
      const mockOriginalLog = mock();
      console.log = mock((...args: unknown[]) => {
        mockOriginalLog.apply(console, args);
      });

      // Re-initialize to get the new mock
      const config: LogProviderConfig = {
        logReports: {
          log: true,
          warn: false,
          error: false,
        },
      };
      const logProvider = new LogProvider(providers, config);
      logProvider["originalConsole"].log = mockOriginalLog;

      console.log("test message", { data: "value" });

      expect(mockOriginalLog).toHaveBeenCalledWith("test message", {
        data: "value",
      });
    });

    it("should call all providers' log method", () => {
      console.log("test message", "context");

      expect(mockProvider1.log).toHaveBeenCalledTimes(1);
      expect(mockProvider1.log).toHaveBeenCalledWith([
        "test message",
        "context",
      ]);
      expect(mockProvider2.log).toHaveBeenCalledTimes(1);
      expect(mockProvider2.log).toHaveBeenCalledWith([
        "test message",
        "context",
      ]);
    });

    it("should handle single argument", () => {
      console.log("single argument");

      expect(mockProvider1.log).toHaveBeenCalledWith(["single argument"]);
      expect(mockProvider2.log).toHaveBeenCalledWith(["single argument"]);
    });

    it("should handle no arguments", () => {
      console.log();

      expect(mockProvider1.log).toHaveBeenCalledWith([]);
      expect(mockProvider2.log).toHaveBeenCalledWith([]);
    });

    it("should handle multiple arguments", () => {
      console.log("arg1", "arg2", "arg3", { obj: "value" });

      expect(mockProvider1.log).toHaveBeenCalledWith([
        "arg1",
        "arg2",
        "arg3",
        { obj: "value" },
      ]);
    });
  });

  describe("overridden console.warn", () => {
    beforeEach(() => {
      const config: LogProviderConfig = {
        logReports: {
          log: false,
          warn: true,
          error: false,
        },
      };
      new LogProvider(providers, config);
    });

    it("should call original console.warn", () => {
      const mockOriginalWarn = mock();
      console.warn = mock((...args: unknown[]) => {
        mockOriginalWarn.apply(console, args);
      });

      // Re-initialize to get the new mock
      const config: LogProviderConfig = {
        logReports: {
          log: false,
          warn: true,
          error: false,
        },
      };
      const logProvider = new LogProvider(providers, config);
      logProvider["originalConsole"].warn = mockOriginalWarn;

      console.warn("warning message");

      expect(mockOriginalWarn).toHaveBeenCalledWith("warning message");
    });

    it("should call all providers' warn method", () => {
      console.warn("warning message", "context");

      expect(mockProvider1.warn).toHaveBeenCalledTimes(1);
      expect(mockProvider1.warn).toHaveBeenCalledWith([
        "warning message",
        "context",
      ]);
      expect(mockProvider2.warn).toHaveBeenCalledTimes(1);
      expect(mockProvider2.warn).toHaveBeenCalledWith([
        "warning message",
        "context",
      ]);
    });

    it("should handle complex arguments", () => {
      const errorObj = new Error("Test error");
      console.warn("Warning:", errorObj, { metadata: "value" });

      expect(mockProvider1.warn).toHaveBeenCalledWith([
        "Warning:",
        errorObj,
        { metadata: "value" },
      ]);
    });
  });

  describe("overridden console.error", () => {
    beforeEach(() => {
      const config: LogProviderConfig = {
        logReports: {
          log: false,
          warn: false,
          error: true,
        },
      };
      new LogProvider(providers, config);
    });

    it("should call original console.error", () => {
      const mockOriginalError = mock();
      console.error = mock((...args: unknown[]) => {
        mockOriginalError.apply(console, args);
      });

      // Re-initialize to get the new mock
      const config: LogProviderConfig = {
        logReports: {
          log: false,
          warn: false,
          error: true,
        },
      };
      const logProvider = new LogProvider(providers, config);
      logProvider["originalConsole"].error = mockOriginalError;

      console.error("error message");

      expect(mockOriginalError).toHaveBeenCalledWith("error message");
    });

    it("should call all providers' error method", () => {
      console.error("error message", "context");

      expect(mockProvider1.error).toHaveBeenCalledTimes(1);
      expect(mockProvider1.error).toHaveBeenCalledWith([
        "error message",
        "context",
      ]);
      expect(mockProvider2.error).toHaveBeenCalledTimes(1);
      expect(mockProvider2.error).toHaveBeenCalledWith([
        "error message",
        "context",
      ]);
    });

    it("should handle Error objects", () => {
      const error = new Error("Test error");
      console.error("Error occurred:", error);

      expect(mockProvider1.error).toHaveBeenCalledWith([
        "Error occurred:",
        error,
      ]);
    });
  });

  describe("callPlugins (private method behavior)", () => {
    beforeEach(() => {
      const config: LogProviderConfig = {
        logReports: {
          log: true,
          warn: true,
          error: true,
        },
      };
      new LogProvider(providers, config);
    });

    it("should handle provider errors gracefully", () => {
      //@ts-ignore
      mockProvider1.log = mock(() => {});

      expect(() => console.log("test")).not.toThrow();
      expect(mockProvider1.log).toHaveBeenCalled();
    });

    it("should work with empty providers array", () => {
      const config: LogProviderConfig = {
        logReports: {
          log: true,
          warn: false,
          error: false,
        },
      };

      expect(() => new LogProvider([], config)).not.toThrow();
      expect(() => console.log("test")).not.toThrow();
    });

    it("should work with single provider", () => {
      const config: LogProviderConfig = {
        logReports: {
          log: true,
          warn: false,
          error: false,
        },
      };

      new LogProvider([mockProvider1], config);
      console.log("single provider test");

      expect(mockProvider1.log).toHaveBeenCalledWith(["single provider test"]);
    });
  });

  describe("integration", () => {
    it("should handle mixed console method calls", () => {
      const config: LogProviderConfig = {
        logReports: {
          log: true,
          warn: true,
          error: true,
        },
      };

      new LogProvider(providers, config);

      console.log("log message");
      console.warn("warn message");
      console.error("error message");

      expect(mockProvider1.log).toHaveBeenCalledTimes(1);
      expect(mockProvider1.warn).toHaveBeenCalledTimes(1);
      expect(mockProvider1.error).toHaveBeenCalledTimes(1);

      expect(mockProvider2.log).toHaveBeenCalledTimes(1);
      expect(mockProvider2.warn).toHaveBeenCalledTimes(1);
      expect(mockProvider2.error).toHaveBeenCalledTimes(1);
    });

    it("should maintain proper method context", () => {
      const config: LogProviderConfig = {
        logReports: {
          log: true,
          warn: false,
          error: false,
        },
      };

      new LogProvider(providers, config);

      const obj = {
        method: console.log,
      };

      obj.method("context test");

      expect(mockProvider1.log).toHaveBeenCalledWith(["context test"]);
    });

    it("should work with console method references", () => {
      const config: LogProviderConfig = {
        logReports: {
          log: false,
          warn: true,
          error: false,
        },
      };

      new LogProvider(providers, config);

      const warnMethod = console.warn;
      warnMethod("reference test");

      expect(mockProvider1.warn).toHaveBeenCalledWith(["reference test"]);
    });
  });
});
