import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { DuckBugConfig } from "../../src/DuckBug/DuckBugConfig";
import { DuckBugProvider } from "../../src/DuckBug/DuckBugProvider";
import { logLevel } from "../../src/SDK/LogLevel";

describe("DuckBugProvider", () => {
  let provider: DuckBugProvider;
  let config: DuckBugConfig;
  let mockService: {
    sendLog: ReturnType<typeof mock>;
    sendError: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    config = {
      dsn: "https://api.duckbug.com",
    };

    mockService = {
      sendLog: mock(() => {}),
      sendError: mock(() => {}),
    };

    // Create provider and replace service with mock
    provider = new DuckBugProvider(config);
    provider.service = mockService as unknown as DuckBugProvider["service"];
  });

  describe("constructor", () => {
    it("should create a DuckBugService instance with the provided config", () => {
      expect(provider.service.sendLog).toBe(mockService.sendLog);
      expect(provider.service.sendError).toBe(mockService.sendError);
    });
  });

  describe("warn", () => {
    it("should send warn log with correct parameters", () => {
      const message = "Warning message";
      const context1 = "Context 1";
      const context2 = { key: "value" };

      spyOn(Date, "now").mockReturnValue(12345);

      provider.warn(message, context1, context2);

      expect(mockService.sendLog).toHaveBeenCalledTimes(1);
      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 12345,
        level: logLevel.WARN,
        message: "Warning message",
        context: [context1, context2],
      });
    });

    it("should handle single argument", () => {
      spyOn(Date, "now").mockReturnValue(12345);

      provider.warn("Single warning");

      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 12345,
        level: logLevel.WARN,
        message: "Single warning",
        context: [],
      });
    });

    it("should handle no arguments", () => {
      spyOn(Date, "now").mockReturnValue(12345);

      provider.warn();

      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 12345,
        level: logLevel.WARN,
        message: "undefined",
        context: [],
      });
    });
  });

  describe("error", () => {
    it("should send error log with correct parameters", () => {
      const message = "Error message";
      const context1 = "Error context";
      const context2 = { error: "details" };

      spyOn(Date, "now").mockReturnValue(54321);

      provider.error(message, context1, context2);

      expect(mockService.sendLog).toHaveBeenCalledTimes(1);
      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 54321,
        level: logLevel.ERROR,
        message: "Error message",
        context: [context1, context2],
      });
    });

    it("should handle objects as first argument", () => {
      const errorObj = { type: "TypeError", message: "Cannot read property" };

      spyOn(Date, "now").mockReturnValue(54321);

      provider.error(errorObj);

      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 54321,
        level: logLevel.ERROR,
        message: '{"type":"TypeError","message":"Cannot read property"}',
        context: [],
      });
    });
  });

  describe("log", () => {
    it("should send info log with correct parameters", () => {
      const message = "Info message";
      const context1 = "Info context";
      const context2 = { info: "data" };

      spyOn(Date, "now").mockReturnValue(67890);

      provider.log(message, context1, context2);

      expect(mockService.sendLog).toHaveBeenCalledTimes(1);
      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 67890,
        level: logLevel.INFO,
        message: "Info message",
        context: [context1, context2],
      });
    });

    it("should handle multiple string arguments", () => {
      spyOn(Date, "now").mockReturnValue(67890);

      provider.log("Message", "arg1", "arg2", "arg3");

      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 67890,
        level: logLevel.INFO,
        message: "Message",
        context: ["arg1", "arg2", "arg3"],
      });
    });
  });

  describe("report", () => {
    it("should send report with correct parameters", () => {
      const tag = "CUSTOM_TAG";
      const payload = { userId: 123, action: "click" };

      spyOn(Date, "now").mockReturnValue(11111);

      provider.report(tag, logLevel.DEBUG, payload);

      expect(mockService.sendLog).toHaveBeenCalledTimes(1);
      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 11111,
        level: logLevel.DEBUG,
        message: tag,
        context: payload,
      });
    });

    it("should handle report without payload", () => {
      const tag = "NO_PAYLOAD_TAG";

      spyOn(Date, "now").mockReturnValue(22222);

      provider.report(tag, logLevel.FATAL);

      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 22222,
        level: logLevel.FATAL,
        message: tag,
        context: undefined,
      });
    });

    it("should work with all log levels", () => {
      const levels = [
        logLevel.DEBUG,
        logLevel.INFO,
        logLevel.WARN,
        logLevel.ERROR,
        logLevel.FATAL,
      ];

      spyOn(Date, "now").mockReturnValue(33333);

      levels.forEach((level, index) => {
        provider.report(`TAG_${index}`, level, { index });
      });

      expect(mockService.sendLog).toHaveBeenCalledTimes(levels.length);
      levels.forEach((level, index) => {
        expect(mockService.sendLog).toHaveBeenNthCalledWith(index + 1, {
          time: 33333,
          level,
          message: `TAG_${index}`,
          context: { index },
        });
      });
    });
  });

  describe("quack", () => {
    it("should send error with correct parameters", () => {
      spyOn(Date, "now").mockReturnValue(1234567890);

      const tag = "QUACK_ERROR";
      const error = new Error("Something went wrong");
      error.stack = "Error: Something went wrong\n    at test.js:42:10";

      provider.quack(tag, error);

      expect(mockService.sendError).toHaveBeenCalledTimes(1);
      const callArgs = mockService.sendError.mock.calls[0][0];
      expect(callArgs).toHaveProperty("time", 1234567890);
      expect(callArgs).toHaveProperty("message", tag);
      expect(callArgs).toHaveProperty("stacktrace");
      expect(callArgs.stacktrace).toHaveProperty("raw", error.stack);
      expect(callArgs.stacktrace).toHaveProperty("frames");
      expect(callArgs).toHaveProperty("file", "test.js");
      expect(callArgs).toHaveProperty("line", 42);
      expect(callArgs).toHaveProperty("context");
      expect(callArgs.context).toEqual({ message: "Something went wrong" });
    });

    it("should handle error without stack trace", () => {
      spyOn(Date, "now").mockReturnValue(1234567890);

      const tag = "NO_STACK_ERROR";
      const error = new Error("Error without stack");
      error.stack = undefined;

      provider.quack(tag, error);

      const callArgs = mockService.sendError.mock.calls[0][0];
      expect(callArgs).toHaveProperty("time", 1234567890);
      expect(callArgs).toHaveProperty("message", tag);
      expect(callArgs).toHaveProperty("stacktrace");
      expect(callArgs.stacktrace).toEqual({ raw: "", frames: [] });
      expect(callArgs).toHaveProperty("file", "unknown");
      expect(callArgs).toHaveProperty("line", 0);
      expect(callArgs.context).toEqual({ message: "Error without stack" });
    });

    it("should handle custom error messages", () => {
      spyOn(Date, "now").mockReturnValue(1234567890);

      const tag = "CUSTOM_ERROR";
      const error = new Error("Custom error message");
      error.stack = "Error: Custom error message\n    at main (index.js:100:5)";

      provider.quack(tag, error);

      const callArgs = mockService.sendError.mock.calls[0][0];
      expect(callArgs).toHaveProperty("time", 1234567890);
      expect(callArgs).toHaveProperty("message", tag);
      expect(callArgs).toHaveProperty("stacktrace");
      expect(callArgs.stacktrace).toHaveProperty("raw", error.stack);
      expect(callArgs).toHaveProperty("file");
      expect(callArgs).toHaveProperty("line");
      expect(callArgs.context).toEqual({ message: "Custom error message" });
    });

    it("should extract file and line from stack trace correctly", () => {
      spyOn(Date, "now").mockReturnValue(1234567890);

      const tag = "FILE_LINE_TEST";
      const error = new Error("Test error");
      error.stack =
        "Error: Test error\n    at Object.foo (src/utils.ts:25:10)\n    at main (index.js:10:5)";

      provider.quack(tag, error);

      const callArgs = mockService.sendError.mock.calls[0][0];
      expect(callArgs.file).toBe("src/utils.ts");
      expect(callArgs.line).toBe(25);
      expect(callArgs.stacktrace.frames.length).toBeGreaterThan(0);
    });
  });

  describe("convertArgsToString (private method behavior)", () => {
    it("should convert mixed arguments correctly through public methods", () => {
      spyOn(Date, "now").mockReturnValue(99999);

      provider.log("String", 123, true, null, undefined, { obj: "value" }, [
        "array",
        "item",
      ]);

      expect(mockService.sendLog).toHaveBeenCalledWith({
        time: 99999,
        level: logLevel.INFO,
        message: "String",
        context: [
          123,
          true,
          null,
          undefined,
          { obj: "value" },
          ["array", "item"],
        ],
      });
    });
  });

  describe("getTimeStamp (private method behavior)", () => {
    it("should use current timestamp", () => {
      const mockTime = 1640995200000; // Fixed timestamp
      spyOn(Date, "now").mockReturnValue(mockTime);

      provider.log("Test timestamp");

      expect(mockService.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          time: mockTime,
        }),
      );
    });

    it("should get fresh timestamp for each call", () => {
      const times = [1000, 2000, 3000];
      const mockNow = spyOn(Date, "now");

      times.forEach((time, index) => {
        mockNow.mockReturnValueOnce(time);
        provider.log(`Message ${index}`);
      });

      times.forEach((time, index) => {
        expect(mockService.sendLog).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            time,
          }),
        );
      });
    });
  });

  describe("integration", () => {
    it("should handle multiple method calls", () => {
      spyOn(Date, "now").mockReturnValue(88888);

      provider.log("Log message");
      provider.warn("Warning message");
      provider.error("Error message");
      provider.report("REPORT_TAG", logLevel.DEBUG, { data: "test" });
      provider.quack("QUACK_TAG", new Error("Quack error"));

      expect(mockService.sendLog).toHaveBeenCalledTimes(4);
      expect(mockService.sendError).toHaveBeenCalledTimes(1);
    });
  });
});
