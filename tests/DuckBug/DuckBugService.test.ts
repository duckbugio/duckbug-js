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
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe(logsUrl);
      expect(callArgs[1]?.method).toBe("POST");
      expect(callArgs[1]?.headers).toEqual({
        "Content-Type": "application/json",
      });
      // The body is the caller's event plus the eventId the service mints for
      // retry idempotency; the id itself is covered by the "eventId" tests.
      expect(JSON.parse(callArgs[1]?.body as string)).toEqual({
        ...JSON.parse(JSON.stringify(logInfo)),
        eventId: expect.any(String),
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
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe(logsUrl);
      expect(callArgs[1]?.method).toBe("POST");
      expect(callArgs[1]?.headers).toEqual({
        "Content-Type": "application/json",
      });
      // The body is the caller's event plus the eventId the service mints for
      // retry idempotency; the id itself is covered by the "eventId" tests.
      expect(JSON.parse(callArgs[1]?.body as string)).toEqual({
        ...JSON.parse(JSON.stringify(logInfo)),
        eventId: expect.any(String),
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
      expect(requestBody).toEqual({
        ...errorRequest,
        eventId: expect.any(String),
      });
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
      expect(requestBody).toEqual({
        ...errorRequest,
        eventId: expect.any(String),
      });
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

  describe("eventId", () => {
    // The shape ingest validates the field against (`omitempty,uuid4`): an id
    // in any other shape is answered with 400, not deduplicated.
    const UUID4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    const bodyOf = (call: unknown[]): Record<string, unknown> =>
      JSON.parse((call[1] as RequestInit).body as string);

    it("mints a uuid4 eventId for a log sent without one", async () => {
      service.sendLog({
        message: "no id from the caller",
        level: logLevel.INFO,
        time: 1234567890,
      });
      await service.flush();

      expect(bodyOf(mockFetch.mock.calls[0]).eventId).toMatch(UUID4);
    });

    it("mints a uuid4 eventId for an error sent without one", async () => {
      service.sendError({
        time: 1234567890,
        message: "no id from the caller",
        stacktrace: { raw: "", frames: [] },
        file: "test.js",
        line: 1,
      });
      await service.flush();

      expect(bodyOf(mockFetch.mock.calls[0]).eventId).toMatch(UUID4);
    });

    it("keeps an eventId the caller supplied", async () => {
      const callerId = "550e8400-e29b-41d4-a716-446655440000";

      service.sendLog({
        eventId: callerId,
        message: "caller owns the id",
        level: logLevel.INFO,
        time: 1234567890,
      });
      await service.flush();

      expect(bodyOf(mockFetch.mock.calls[0]).eventId).toBe(callerId);
    });

    it("mints a distinct eventId per batched event", async () => {
      const batching = new DuckBugService({
        dsn: TEST_DSN,
        transport: { maxBatchSize: 2 },
      });

      batching.sendLog({
        message: "first",
        level: logLevel.INFO,
        time: 1,
      });
      batching.sendLog({
        message: "second",
        level: logLevel.INFO,
        time: 2,
      });
      await batching.flush();

      const batch = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      ) as Array<Record<string, unknown>>;
      expect(batch).toHaveLength(2);
      expect(batch[0].eventId).toMatch(UUID4);
      expect(batch[1].eventId).toMatch(UUID4);
      expect(batch[0].eventId).not.toBe(batch[1].eventId);
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
