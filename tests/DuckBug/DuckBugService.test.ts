import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { DuckBugConfig } from "../../src/DuckBug/DuckBugConfig";
import { DuckBugService } from "../../src/DuckBug/DuckBugService";
import type { Log } from "../../src/DuckBug/Log";
import { logLevel } from "../../src/SDK/LogLevel";

//@ts-ignore
global.fetch = mock(() => Promise.resolve(new Response()));

describe("DuckBugService", () => {
  let service: DuckBugService;
  let config: DuckBugConfig;
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    config = {
      dsn: "https://api.duckbug.com",
    };
    service = new DuckBugService(config);
    mockFetch = fetch as ReturnType<typeof mock>;
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

      const calls = mockFetch.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toBe(`${customConfig.dsn}/logs`);
    });
  });

  describe("sendError", () => {
    it("should send error request to the correct endpoint", () => {
      const errorRequest = {
        time: 1234567890,
        message: "Test error",
        stacktrace: {
          raw: "Error: Test error\n    at test.js:10:5",
          frames: [
            { index: 0, content: "Error: Test error" },
            { index: 1, content: "    at test.js:10:5" },
          ],
        },
        file: "test.js",
        line: 10,
        context: { message: "Error context" },
      };

      service.sendError(errorRequest);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe(`${config.dsn}/errors`);
      expect(callArgs[1]?.method).toBe("POST");
      expect(callArgs[1]?.headers).toEqual({
        "Content-Type": "application/json",
      });

      const requestBody = JSON.parse(callArgs[1]?.body as string);
      expect(requestBody).toEqual(errorRequest);
    });

    it("should send error request without context", () => {
      const errorRequest = {
        time: 1234567890,
        message: "Test error",
        stacktrace: {
          raw: "",
          frames: [],
        },
        file: "unknown",
        line: 0,
      };

      service.sendError(errorRequest);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      expect(requestBody).toEqual(errorRequest);
    });

    it("should send error request with all fields", () => {
      const errorRequest = {
        time: 1234567890,
        message: "Test error",
        stacktrace: {
          raw: "Error stack",
          frames: [{ index: 0, content: "Error stack" }],
        },
        file: "index.js",
        line: 42,
        context: { key: "value" },
      };

      service.sendError(errorRequest);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      expect(requestBody.time).toBe(1234567890);
      expect(requestBody.message).toBe("Test error");
      expect(requestBody.file).toBe("index.js");
      expect(requestBody.line).toBe(42);
      expect(requestBody.context).toEqual({ key: "value" });
    });

    it("should use the correct DSN from config for errors", () => {
      const customConfig: DuckBugConfig = {
        dsn: "https://error-api.example.com",
      };
      const customService = new DuckBugService(customConfig);

      const errorRequest = {
        time: 1234567890,
        message: "Test error",
        stacktrace: { raw: "", frames: [] },
        file: "test.js",
        line: 1,
      };

      customService.sendError(errorRequest);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe(`${customConfig.dsn}/errors`);
      expect(callArgs[1]?.method).toBe("POST");
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
      const calls = mockFetch.mock.calls;
      expect(calls[0][0]).toBe(`${config.dsn}/logs`);
      expect(calls[1][0]).toBe(`${config.dsn}/errors`);
      expect(calls[2][0]).toBe(`${config.dsn}/logs`);
    });
  });
});
