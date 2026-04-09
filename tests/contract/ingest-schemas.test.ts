import { beforeAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  buildFullLiveError,
  buildFullLiveLog,
  LIVE_TAG_BASE,
} from "../fixtures/liveIngestFullPayload";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadJson(pathFromRoot: string): unknown {
  return JSON.parse(readFileSync(join(rootDir, pathFromRoot), "utf8"));
}

describe("ingest JSON schemas (duckbug-sdk-spec)", () => {
  let validateError: ReturnType<Ajv2020["compile"]>;
  let validateLog: ReturnType<Ajv2020["compile"]>;

  beforeAll(() => {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      allowUnionTypes: true,
    });
    addFormats(ajv);
    const errorSchema = loadJson("schemas/error-event.schema.json");
    const logSchema = loadJson("schemas/log-event.schema.json");
    validateError = ajv.compile(errorSchema);
    validateLog = ajv.compile(logSchema);
  });

  describe("error-event.schema.json", () => {
    it("accepts minimal valid payload", () => {
      const ok = validateError({
        time: 1_704_067_200_000,
        message: "Division by zero",
        stacktrace: [{ file: "/app/calc.ts", line: 42, function: "divide" }],
        file: "/app/calc.ts",
        line: 42,
      });
      expect(ok).toBe(true);
    });

    it("accepts payload with optional fields from spec example shape", () => {
      const ok = validateError({
        eventId: "550e8400-e29b-41d4-a716-446655440000",
        time: 1_704_067_200_000,
        message: "Division by zero in calculate()",
        exception: {
          type: "Error",
          message: "Division by zero in calculate()",
        },
        stacktrace: [
          { file: "/var/www/app/Service.ts", line: 42, function: "divide" },
        ],
        stacktraceAsString: "Error: Division by zero",
        file: "/var/www/app/Service.ts",
        line: 42,
        platform: "node",
        handled: true,
        mechanism: "manual",
        sdk: { name: "@duckbug/js" },
      });
      expect(ok).toBe(true);
    });

    it("rejects missing required fields", () => {
      const ok = validateError({
        time: 1,
        message: "x",
        file: "f",
        line: 1,
      });
      expect(ok).toBe(false);
    });

    it("rejects unknown top-level properties", () => {
      const ok = validateError({
        time: 1,
        message: "m",
        stacktrace: [],
        file: "f",
        line: 1,
        unknownField: true,
      });
      expect(ok).toBe(false);
    });

    it("accepts full live-ingest error fixture (all optional fields + dTags)", () => {
      const payload = buildFullLiveError(1_704_067_200_000);
      expect(payload.dTags?.length).toBeGreaterThanOrEqual(
        LIVE_TAG_BASE.length,
      );
      expect(validateError(payload)).toBe(true);
    });
  });

  describe("log-event.schema.json", () => {
    it("accepts minimal valid payload", () => {
      const ok = validateLog({
        time: 1_704_067_200_000,
        level: "WARN",
        message: "Payment provider timeout",
      });
      expect(ok).toBe(true);
    });

    it("accepts payload with context", () => {
      const ok = validateLog({
        time: 1,
        level: "INFO",
        message: "hello",
        context: { provider: "stripe", attempt: 2 },
        platform: "node",
      });
      expect(ok).toBe(true);
    });

    it("rejects invalid level", () => {
      const ok = validateLog({
        time: 1,
        level: "warning",
        message: "m",
      });
      expect(ok).toBe(false);
    });

    it("accepts full live-ingest log fixture (all optional fields + dTags)", () => {
      const payload = buildFullLiveLog(1_704_067_200_000);
      expect(payload.dTags?.length).toBeGreaterThanOrEqual(
        LIVE_TAG_BASE.length,
      );
      expect(validateLog(payload)).toBe(true);
    });
  });
});
