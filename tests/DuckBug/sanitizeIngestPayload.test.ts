import { describe, expect, it } from "bun:test";
import { sanitizeIngestPayload } from "../../src/DuckBug/sanitizeIngestPayload";

describe("sanitizeIngestPayload", () => {
  it("masks default sensitive keys in nested context", () => {
    const input = {
      time: 1,
      level: "INFO",
      message: "x",
      context: { user: "a", password: "secret", nested: { token: "t" } },
    };
    const out = sanitizeIngestPayload(input);
    expect(out.context).toEqual({
      user: "a",
      password: "***",
      nested: { token: "***" },
    });
  });

  it("honors extra sensitive key names", () => {
    const input = { a: 1, mySecret: "hide" };
    const out = sanitizeIngestPayload(input, ["mySecret"]);
    expect(out).toEqual({ a: 1, mySecret: "***" });
  });
});
