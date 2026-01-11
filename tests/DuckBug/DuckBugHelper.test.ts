import { describe, expect, it } from "bun:test";
import { parseError, processError } from "../../src/DuckBug/DuckBugHelper";

describe("DuckBugHelper", () => {
  describe("processError", () => {
    it("should process error with stack trace and return ErrorRequest", () => {
      const error = new Error("Test error message");
      error.stack =
        "Error: Test error message\n    at Object.foo (src/utils.ts:42:10)\n    at main (index.js:10:5)";

      const result = processError(error, "Custom message", 1234567890);

      expect(result).toEqual({
        time: 1234567890,
        message: "Custom message",
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
        context: { message: "Test error message" },
      });
    });

    it("should process error without stack trace", () => {
      const error = new Error("Error without stack");
      error.stack = undefined;

      const result = processError(error, "Tag", 999999);

      expect(result).toEqual({
        time: 999999,
        message: "Tag",
        file: "unknown",
        line: 0,
        stacktrace: {
          raw: "",
          frames: [],
        },
        context: { message: "Error without stack" },
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

    it("should use provided time and message", () => {
      const error = new Error("Test");
      const time = 9876543210;
      const message = "Custom error tag";

      const result = processError(error, message, time);

      expect(result.time).toBe(time);
      expect(result.message).toBe(message);
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
      const error1 = new Error("Test");
      error1.stack = "Error: Test\n    at Object.method (file.js:100:20)";
      const result1 = parseError(error1);
      expect(result1.file).toBe("file.js");
      expect(result1.line).toBe(100);

      const error2 = new Error("Test");
      error2.stack = "Error: Test\n    at file.js:50:15";
      const result2 = parseError(error2);
      expect(result2.file).toBe("file.js");
      expect(result2.line).toBe(50);

      const error3 = new Error("Test");
      error3.stack = "Error: Test\n    at async handler (src/app.ts:42:10)";
      const result3 = parseError(error3);
      expect(result3.file).toBe("src/app.ts");
      expect(result3.line).toBe(42);
    });

    it("should handle file:// prefix in file path", () => {
      const error = new Error("Test");
      error.stack = "Error: Test\n    at (file:///Users/test/app.js:10:5)";

      const result = parseError(error);

      expect(result.file).toBe("Users/test/app.js");
      expect(result.line).toBe(10);
    });

    it("should handle absolute paths with leading slashes", () => {
      const error = new Error("Test");
      error.stack = "Error: Test\n    at (/var/www/app/index.js:15:3)";

      const result = parseError(error);

      expect(result.file).toBe("var/www/app/index.js");
      expect(result.line).toBe(15);
    });

    it("should parse JSON context from error message", () => {
      const error = new Error('{"key":"value","number":123}');

      const result = parseError(error);

      expect(result.context).toEqual({ key: "value", number: 123 });
    });

    it("should wrap non-JSON context in object", () => {
      const error = new Error("Simple error message");

      const result = parseError(error);

      expect(result.context).toEqual({ message: "Simple error message" });
    });

    it("should handle error with empty message", () => {
      const error = new Error("");
      error.stack = "Error\n    at test.js:1:1";

      const result = parseError(error);

      expect(result.context).toBeNull();
    });

    it("should parse multi-line stack trace correctly", () => {
      const error = new Error("Multi-line error");
      error.stack = `Error: Multi-line error
    at firstFunction (file1.js:10:5)
    at secondFunction (file2.js:20:10)
    at thirdFunction (file3.js:30:15)`;

      const result = parseError(error);

      expect(result.file).toBe("file1.js");
      expect(result.line).toBe(10);
      expect((result.stacktrace as { frames: unknown[] }).frames.length).toBe(
        4,
      );
      expect(
        (result.stacktrace as { frames: { content: string }[] }).frames[0]
          .content,
      ).toBe("Error: Multi-line error");
    });

    it("should handle stack trace with only error message", () => {
      const error = new Error("Just message");
      error.stack = "Error: Just message";

      const result = parseError(error);

      expect(result.file).toBe("unknown");
      expect(result.line).toBe(0);
      expect((result.stacktrace as { frames: unknown[] }).frames.length).toBe(
        1,
      );
    });

    it("should handle stack trace with whitespace-only lines", () => {
      const error = new Error("Test");
      error.stack = "Error: Test\n    \n    at test.js:5:10\n    ";

      const result = parseError(error);

      const frames = (result.stacktrace as { frames: { content: string }[] })
        .frames;
      expect(frames.length).toBeGreaterThan(0);
      expect(frames.every((frame) => frame.content.trim().length > 0)).toBe(
        true,
      );
    });
  });

  describe("stacktrace parsing (via parseError)", () => {
    it("should return unknown file and line 0 for undefined stack", () => {
      const error = new Error("Test");
      error.stack = undefined;
      const parsed = parseError(error);

      expect(parsed.file).toBe("unknown");
      expect(parsed.line).toBe(0);
    });

    it("should correctly parse file and line from standard stack format", () => {
      const error = new Error("Test");
      error.stack =
        "Error: Test\n    at MyClass.method (path/to/file.ts:123:45)";

      const result = parseError(error);

      expect(result.file).toBe("path/to/file.ts");
      expect(result.line).toBe(123);
    });

    it("should create frames array with correct structure", () => {
      const error = new Error("Test");
      error.stack = "Error: Test\n    at line1\n    at line2";

      const result = parseError(error);

      const stacktrace = result.stacktrace as {
        raw: string;
        frames: Array<{ index: number; content: string }>;
      };

      expect(stacktrace.frames).toHaveLength(3);
      expect(stacktrace.frames[0]).toEqual({
        index: 0,
        content: "Error: Test",
      });
      expect(stacktrace.frames[1]).toEqual({
        index: 1,
        content: "at line1",
      });
      expect(stacktrace.frames[2]).toEqual({
        index: 2,
        content: "at line2",
      });
    });
  });

  describe("context parsing (via parseError)", () => {
    it("should return null for undefined context", () => {
      const error = new Error("");
      error.stack = undefined;
      const result = parseError(error);

      expect(result.context).toBeNull();
    });

    it("should parse valid JSON context", () => {
      const error = new Error('{"user":"john","action":"login"}');

      const result = parseError(error);

      expect(result.context).toEqual({ user: "john", action: "login" });
    });

    it("should wrap plain text in object", () => {
      const error = new Error("Plain error text");

      const result = parseError(error);

      expect(result.context).toEqual({ message: "Plain error text" });
    });

    it("should handle invalid JSON gracefully", () => {
      const error = new Error('{"invalid": json}');

      const result = parseError(error);

      expect(result.context).toEqual({ message: '{"invalid": json}' });
    });
  });
});
