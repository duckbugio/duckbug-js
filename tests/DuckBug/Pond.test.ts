import { describe, expect, it } from "bun:test";
import { Pond } from "../../src/DuckBug/Pond";

describe("Pond", () => {
  it("ripple returns extra sensitive keys list", () => {
    expect(Pond.ripple(["password", "token"])).toEqual({
      extraSensitiveKeys: ["password", "token"],
    });
  });
});
