import { describe, expect, it, spyOn } from "bun:test";
import { finalizeIngestEvent } from "../../src/DuckBug/finalizeIngestEvent";
import { logLevel } from "../../src/SDK/LogLevel";
import { SDK_IDENTITY } from "../../src/sdkIdentity";

describe("finalizeIngestEvent", () => {
  const uuid = "11111111-1111-4111-8111-111111111111";

  it("adds eventId when missing", () => {
    const spy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);
    const out = finalizeIngestEvent({
      time: 1,
      level: logLevel.INFO,
      message: "m",
    });
    expect(out.eventId).toBe(uuid);
    spy.mockRestore();
  });

  it("preserves caller eventId", () => {
    const existing = "550e8400-e29b-41d4-a716-446655440000";
    const out = finalizeIngestEvent({
      time: 1,
      level: logLevel.INFO,
      message: "m",
      eventId: existing,
    });
    expect(out.eventId).toBe(existing);
  });

  it("adds default sdk when missing (matches DuckSDK / ingest expectations)", () => {
    const out = finalizeIngestEvent({
      time: 1,
      level: logLevel.INFO,
      message: "m",
    });
    expect(out.sdk).toEqual({ ...SDK_IDENTITY });
  });

  it("preserves caller sdk", () => {
    const custom = { name: "custom", version: "9.9.9" };
    const out = finalizeIngestEvent({
      time: 1,
      level: logLevel.INFO,
      message: "m",
      sdk: custom,
    });
    expect(out.sdk).toEqual(custom);
  });
});
