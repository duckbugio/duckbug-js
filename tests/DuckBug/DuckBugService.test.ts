import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DuckBugConfig } from "../../src/DuckBug/DuckBugConfig";
import { DuckBugService } from "../../src/DuckBug/DuckBugService";
import type { Log } from "../../src/DuckBug/Log";
import { logLevel } from "../../src/SDK/LogLevel";

//@ts-ignore
global.fetch = vi.fn();

describe("DuckBugService", () => {
  let service: DuckBugService;
  let config: DuckBugConfig;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    config = {
      dsn: "https://api.duckbug.com",
    };
    service = new DuckBugService(config);
    mockFetch = vi.mocked(fetch);
    mockFetch.mockClear();
  });

  describe("sendLog", () => {
    it("should send log data to the correct endpoint", () => {
      const logInfo: Log = {
        message: "Test log message",
        level: logLevel.INFO,
        time: Date.now(),
        context: "Test context",
      };

      service.sendLog(logInfo);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(`${config.dsn}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logInfo),
      });
    });

    it("should handle log with undefined context", () => {
      const logInfo: Log = {
        message: "Test log message",
        level: logLevel.WARN,
        time: Date.now(),
        context: undefined,
      };

      service.sendLog(logInfo);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(`${config.dsn}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logInfo),
      });
    });

    it("should work with different log levels", () => {
      const logLevels = [
        logLevel.DEBUG,
        logLevel.INFO,
        logLevel.WARN,
        logLevel.ERROR,
        logLevel.FATAL,
      ];

      logLevels.forEach((level, index) => {
        const logInfo: Log = {
          message: `Test message ${index}`,
          level,
          time: Date.now(),
          context: `Context ${index}`,
        };

        service.sendLog(logInfo);
      });

      expect(mockFetch).toHaveBeenCalledTimes(logLevels.length);
    });

    it("should use the correct DSN from config", () => {
      const customConfig: DuckBugConfig = {
        dsn: "https://custom-api.example.com",
      };
      const customService = new DuckBugService(customConfig);

      const logInfo: Log = {
        message: "Test message",
        level: logLevel.ERROR,
        time: Date.now(),
        context: "Test context",
      };

      customService.sendLog(logInfo);

      expect(mockFetch).toHaveBeenCalledWith(
        `${customConfig.dsn}/logs`,
        expect.any(Object),
      );
    });
  });

  describe("sendError", () => {
    it("should send error data to the correct endpoint", () => {
      const errorInfo = {
        message: "Test error",
        stack: "Error stack trace",
        context: "Error context",
      };

      service.sendError(errorInfo);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(`${config.dsn}/errors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorInfo),
      });
    });

    it("should handle error without stack trace", () => {
      const errorInfo = {
        message: "Test error without stack",
        context: "Error context",
      };

      service.sendError(errorInfo);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(`${config.dsn}/errors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorInfo),
      });
    });

    it("should handle error with empty stack", () => {
      const errorInfo = {
        message: "Test error with empty stack",
        stack: "",
        context: "Error context",
      };

      service.sendError(errorInfo);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(`${config.dsn}/errors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorInfo),
      });
    });

    it("should use the correct DSN from config for errors", () => {
      const customConfig: DuckBugConfig = {
        dsn: "https://error-api.example.com",
      };
      const customService = new DuckBugService(customConfig);

      const errorInfo = {
        message: "Test error",
        stack: "Stack trace",
        context: "Error context",
      };

      customService.sendError(errorInfo);

      expect(mockFetch).toHaveBeenCalledWith(
        `${customConfig.dsn}/errors`,
        expect.any(Object),
      );
    });
  });

  describe("integration", () => {
    it("should handle multiple consecutive calls", () => {
      const logInfo: Log = {
        message: "First log",
        level: logLevel.INFO,
        time: Date.now(),
        context: "First context",
      };

      const errorInfo = {
        message: "First error",
        stack: "Error stack",
        context: "Error context",
      };

      service.sendLog(logInfo);
      service.sendError(errorInfo);
      service.sendLog({ ...logInfo, message: "Second log" });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `${config.dsn}/logs`,
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${config.dsn}/errors`,
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        `${config.dsn}/logs`,
        expect.any(Object),
      );
    });
  });
});
