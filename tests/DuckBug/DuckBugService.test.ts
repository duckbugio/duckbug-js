import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { DuckBugConfig } from "../../src/DuckBug/DuckBugConfig";
import { DuckBugService } from "../../src/DuckBug/DuckBugService";
import type { Log } from "../../src/DuckBug/Log";
import { logLevel } from "../../src/SDK/LogLevel";

const TEST_DSN = "https://api.duckbug.com/ingest/test-project:test-key";
const logsUrl = `${new URL(TEST_DSN).origin}/ingest/test-project:test-key/logs`;
const errorsUrl = `${new URL(TEST_DSN).origin}/ingest/test-project:test-key/errors`;

// @ts-ignore
global.fetch = mock(() => Promise.resolve(new Response()));

describe("DuckBugService", () => {
  let service: DuckBugService;
  let config: DuckBugConfig;
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    config = {
      dsn: TEST_DSN,
    };
    service = new DuckBugService(config);
    mockFetch = fetch as unknown as ReturnType<typeof mock>;
    mockFetch.mockClear();
  });

  describe("sendLog", () => {
    it("should send log data to the correct endpoint", async () => {
      const logInfo: Log = {
        message: "Test log message",
        level: logLevel.INFO,
        time: Date.now(),
        context: { message: "Test context" },
      };

      service.sendLog(logInfo);
      await service.flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(logsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logInfo),
      });
    });

    it("should handle log with undefined context", async () => {
      const logInfo: Log = {
        message: "Test log message",
        level: logLevel.WARN,
        time: Date.now(),
        context: undefined,
      };

      service.sendLog(logInfo);
      await service.flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(logsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logInfo),
      });
    });

    it("should work with different log levels", async () => {
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
          context: { message: `Context ${index}` },
        };

        service.sendLog(logInfo);
      });

      await service.flush();
      expect(mockFetch).toHaveBeenCalledTimes(logLevels.length);
    });

    it("should use the correct DSN from config", async () => {
      const customDsn = "https://custom-api.example.com/ingest/p:k";
      const customConfig: DuckBugConfig = {
        dsn: customDsn,
      };
      const customService = new DuckBugService(customConfig);

      const logInfo: Log = {
        message: "Test message",
        level: logLevel.ERROR,
        time: Date.now(),
        context: { message: "Test context" },
      };

      customService.sendLog(logInfo);
      await customService.flush();

      const calls = mockFetch.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toBe(
        "https://custom-api.example.com/ingest/p:k/logs",
      );
    });
  });

  describe("sendError", () => {
    it("should send error request to the correct endpoint", async () => {
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
      await service.flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe(errorsUrl);
      expect(callArgs[1]?.method).toBe("POST");
      expect(callArgs[1]?.headers).toEqual({
        "Content-Type": "application/json",
      });

      const requestBody = JSON.parse(callArgs[1]?.body as string);
      expect(requestBody).toEqual(errorRequest);
    });

    it("should send error request without context", async () => {
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
      await service.flush();

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      expect(requestBody).toEqual(errorRequest);
    });

    it("should send error request with all fields", async () => {
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
      await service.flush();

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      expect(requestBody.time).toBe(1234567890);
      expect(requestBody.message).toBe("Test error");
      expect(requestBody.file).toBe("index.js");
      expect(requestBody.line).toBe(42);
      expect(requestBody.context).toEqual({ key: "value" });
    });

    it("should use the correct DSN from config for errors", async () => {
      const customDsn = "https://error-api.example.com/ingest/proj:key";
      const customConfig: DuckBugConfig = {
        dsn: customDsn,
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
      await customService.flush();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe(
        "https://error-api.example.com/ingest/proj:key/errors",
      );
      expect(callArgs[1]?.method).toBe("POST");
    });
  });

  describe("integration", () => {
    it("should handle multiple consecutive calls", async () => {
      const logInfo: Log = {
        message: "First log",
        level: logLevel.INFO,
        time: Date.now(),
        context: { message: "First context" },
      };

      const errorInfo = {
        time: Date.now(),
        message: "First error",
        stacktrace: { raw: "Error stack", frames: [] },
        file: "unknown",
        line: 0,
        context: { message: "Error context" },
      };

      service.sendLog(logInfo);
      service.sendError(errorInfo);
      service.sendLog({ ...logInfo, message: "Second log" });
      await service.flush();

      expect(mockFetch).toHaveBeenCalledTimes(3);
      const calls = mockFetch.mock.calls;
      expect(calls[0][0]).toBe(logsUrl);
      expect(calls[1][0]).toBe(errorsUrl);
      expect(calls[2][0]).toBe(logsUrl);
    });
  });
});
