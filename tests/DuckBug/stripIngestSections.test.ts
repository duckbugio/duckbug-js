import { describe, expect, it } from "bun:test";
import { stripIngestSections } from "../../src/DuckBug/stripIngestSections";
import { logLevel } from "../../src/SDK/LogLevel";

describe("stripIngestSections", () => {
  it("removes listed top-level fields", () => {
    const e = stripIngestSections(
      {
        time: 1,
        level: logLevel.INFO,
        message: "x",
        headers: { a: 1 },
        cookies: { c: 1 },
      },
      ["headers", "cookies"],
    );
    expect(e.headers).toBeUndefined();
    expect(e.cookies).toBeUndefined();
    expect(e.message).toBe("x");
  });

  it("returns same reference when nothing to strip", () => {
    const e = {
      time: 1,
      level: logLevel.INFO,
      message: "x",
      headers: { a: 1 },
    };
    expect(stripIngestSections(e, undefined)).toBe(e);
    expect(stripIngestSections(e, [])).toBe(e);
  });
});
