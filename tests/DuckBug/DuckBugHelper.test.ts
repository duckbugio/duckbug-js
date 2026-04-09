import { describe, expect, it } from "bun:test";
import { parseError, processError } from "../../src/DuckBug/DuckBugHelper";
import { SDK_IDENTITY } from "../../src/sdkIdentity";

describe("DuckBugHelper", () => {
  describe("processError", () => {
    it("should process error with stack trace and return DuckBug error event", () => {
      const error = new Error("Test error message");
      error.stack =
        "Error: Test error message\n    at Object.foo (src/utils.ts:42:10)\n    at main (index.js:10:5)";

      const result = processError(error, "Custom tag", 1234567890);

      expect(result).toEqual({
        time: 1234567890,
        message: "Test error message",
        dTags: ["Custom tag"],
        file: "src/utils.ts",
        line: 42,
        stacktrace: {
          raw: error.stack,
          frames: [
            { index: 0, content: "Error: Test error message" },
            { index: 1, content: "at Object.foo (src/utils.ts:42:10)" },
            { index: 2, content: "at main (index.js:10:5)" },
          ],
        },
        stacktraceAsString: error.stack,
        exception: { type: "Error", message: "Test error message" },
        platform: "node",
        sdk: { ...SDK_IDENTITY },
      });
    });

    it("should process error without stack trace", () => {
      const error = new Error("Error without stack");
      error.stack = undefined;

      const result = processError(error, "Tag", 999999);

      expect(result).toEqual({
        time: 999999,
        message: "Error without stack",
        dTags: ["Tag"],
        file: "unknown",
        line: 0,
        stacktrace: {
          raw: "",
          frames: [],
        },
        stacktraceAsString: "",
        exception: { type: "Error", message: "Error without stack" },
        platform: "node",
        sdk: { ...SDK_IDENTITY },
      });
    });

    it("should process error with empty stack", () => {
      const error = new Error("Error with empty stack");
      error.stack = "";

      const result = processError(error, "Tag", 111111);

      expect(result.file).toBe("unknown");
      expect(result.line).toBe(0);
      expect(result.stacktrace).toEqual({
        raw: "",
        frames: [],
      });
    });

    it("should use error message and tag as dTags", () => {
      const error = new Error("Test");
      const time = 9876543210;
      const tag = "Custom error tag";

      const result = processError(error, tag, time);

      expect(result.time).toBe(time);
      expect(result.message).toBe("Test");
      expect(result.dTags).toEqual([tag]);
    });

    it("should attach extra when error.message is JSON object", () => {
      const error = new Error('{"reason":"timeout","ms":500}');

      const result = processError(error, "json", 1);

      expect(result.extra).toEqual({ reason: "timeout", ms: 500 });
    });
  });

  describe("parseError", () => {
    it("should parse error with full stack trace", () => {
      const error = new Error("Test error");
      error.stack =
        "Error: Test error\n    at testFunction (test.js:25:5)\n    at wrapper (test.js:50:10)";

      const result = parseError(error);

      expect(result.file).toBe("test.js");
      expect(result.line).toBe(25);
      expect(result.stacktrace).toHaveProperty("raw", error.stack);
      expect(result.stacktrace).toHaveProperty("frames");
      expect((result.stacktrace as { frames: unknown[] }).frames.length).toBe(
        3,
      );
      expect(result.context).toEqual({ message: "Test error" });
    });

    it("should parse error without stack", () => {
      const error = new Error("No stack error");
      error.stack = undefined;

      const result = parseError(error);

      expect(result.file).toBe("unknown");
      expect(result.line).toBe(0);
      expect(result.stacktrace).toEqual({
        raw: "",
        frames: [],
      });
      expect(result.context).toEqual({ message: "No stack error" });
    });

    it("should extract file and line from different stack formats", () => {
      const error = new Error("Format test");
      error.stack = "Error: Format test\n    at func (/path/to/file.ts:100:20)";

      const result = parseError(error);

      expect(result.file).toBe("path/to/file.ts");
      expect(result.line).toBe(100);
    });

    it("should handle file:// prefix in file path", () => {
      const error = new Error("File URL test");
      error.stack =
        "Error: File URL test\n    at func (file:///app/src/module.js:15:8)";

      const result = parseError(error);

      expect(result.file).toBe("app/src/module.js");
      expect(result.line).toBe(15);
    });

    it("should handle absolute paths with leading slashes", () => {
      const error = new Error("Absolute path test");
      error.stack =
        "Error: Absolute path test\n    at func (/usr/src/app.js:20:10)";

      const result = parseError(error);

      expect(result.file).toBe("usr/src/app.js");
      expect(result.line).toBe(20);
    });

    it("should parse JSON context from error message", () => {
      const error = new Error('{"userId":123,"action":"test"}');

      const result = parseError(error);

      expect(result.context).toEqual({ userId: 123, action: "test" });
    });

    it("should wrap non-JSON context in object", () => {
      const error = new Error("Plain text error");

      const result = parseError(error);

      expect(result.context).toEqual({ message: "Plain text error" });
    });

    it("should handle error with empty message", () => {
      const error = new Error("");
      error.stack = "Error\n    at test.js:1:1";

      const result = parseError(error);

      expect(result.context).toBeNull();
    });

    it("should parse multi-line stack trace correctly", () => {
      const error = new Error("Multi-line test");
      error.stack = `Error: Multi-line test
    at first (file1.js:10:5)
    at second (file2.js:20:10)
    at third (file3.js:30:15)`;

      const result = parseError(error);

      expect(result.stacktrace.frames.length).toBe(4);
      expect(result.file).toBe("file1.js");
      expect(result.line).toBe(10);
    });

    it("should handle stack trace with only error message", () => {
      const error = new Error("Only message");
      error.stack = "Error: Only message";

      const result = parseError(error);

      expect(result.stacktrace.frames.length).toBe(1);
      expect(result.file).toBe("unknown");
      expect(result.line).toBe(0);
    });

    it("should handle stack trace with whitespace-only lines", () => {
      const error = new Error("Whitespace test");
      error.stack =
        "Error: Whitespace test\n\n    at func (test.js:5:5)\n  \n   ";

      const result = parseError(error);

      expect(result.file).toBe("test.js");
      expect(result.line).toBe(5);
    });
  });

  describe("stacktrace parsing (via parseError)", () => {
    it("should return unknown file and line 0 for undefined stack", () => {
      const error = new Error("No stack");
      error.stack = undefined;

      const result = parseError(error);

      expect(result.file).toBe("unknown");
      expect(result.line).toBe(0);
      expect(result.stacktrace.frames).toEqual([]);
    });

    it("should correctly parse file and line from standard stack format", () => {
      const error = new Error("Standard format");
      error.stack =
        "Error: Standard format\n    at myFunction (/home/user/app.js:42:15)";

      const result = parseError(error);

      expect(result.file).toBe("home/user/app.js");
      expect(result.line).toBe(42);
    });

    it("should create frames array with correct structure", () => {
      const error = new Error("Frame structure");
      error.stack =
        "Error: Frame structure\n    at a (a.js:1:1)\n    at b (b.js:2:2)";

      const result = parseError(error);

      expect(result.stacktrace.frames[0]).toEqual({
        index: 0,
        content: "Error: Frame structure",
      });
      expect(result.stacktrace.frames[1]).toEqual({
        index: 1,
        content: "at a (a.js:1:1)",
      });
    });
  });

  describe("context parsing (via parseError)", () => {
    it("should return null for undefined context", () => {
      const error = new Error();
      error.message = "";
      error.stack = undefined;

      const result = parseError(error);

      expect(result.context).toBeNull();
    });

    it("should parse valid JSON context", () => {
      const error = new Error('{"key":"value","number":42}');

      const result = parseError(error);

      expect(result.context).toEqual({ key: "value", number: 42 });
    });

    it("should wrap plain text in object", () => {
      const error = new Error("Not JSON at all");

      const result = parseError(error);

      expect(result.context).toEqual({ message: "Not JSON at all" });
    });

    it("should handle invalid JSON gracefully", () => {
      const error = new Error("{invalid json");

      const result = parseError(error);

      expect(result.context).toEqual({ message: "{invalid json" });
    });
  });
});
