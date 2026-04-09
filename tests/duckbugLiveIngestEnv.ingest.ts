import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DuckBugProvider } from "../src/DuckBug/DuckBugProvider";
import { parseDuckBugIngestDsn } from "../src/DuckBug/parseDuckBugDsn";
import {
  buildFullLiveError,
  buildFullLiveLog,
} from "./fixtures/liveIngestFullPayload";

/** Project root (directory with `package.json`), not `process.cwd()` (IDEs/tests may differ). */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal `.env` load so live ingest works without relying on CLI `--env-file` or cwd. */
function loadDotEnvIfPresent(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnvIfPresent(join(REPO_ROOT, ".env"));

function missingLiveDsnMessage(): string {
  const dotEnvPath = join(REPO_ROOT, ".env");
  if (existsSync(dotEnvPath)) {
    return (
      "`.env` exists but `DUCKBUG_TEST_DSN` is missing or empty. " +
      "Add e.g. `DUCKBUG_TEST_DSN=https://duckbug.io/api/ingest/{projectId}:{publicKey}` (see `.env.example`). " +
      "Do not commit secrets."
    );
  }
  return (
    "No `DUCKBUG_TEST_DSN`. From the repo root: `cp .env.example .env`, set `DUCKBUG_TEST_DSN` in `.env`, then re-run. " +
    "Or export it in your shell. Do not commit secrets."
  );
}

/**
 * Opt-in live ingest: `.ingest.ts` is not picked up by default `bun test` discovery.
 *
 * Set `DUCKBUG_TEST_DSN` (e.g. in `.env`; Bun loads it for `bun test`).
 *
 * - `bun test ./tests/duckbugLiveIngestEnv.ingest.ts` — skipped if DSN unset (harmless).
 * - `bun run test:live-ingest` — fails fast if DSN unset (expects a real run).
 *
 * Payloads: {@link buildFullLiveLog} / {@link buildFullLiveError} (all shared contract fields + `dTags`).
 *
 * Example (do not commit real keys):
 * `DUCKBUG_TEST_DSN=https://duckbug.io/api/ingest/{projectId}:{publicKey}`
 */
const LIVE_DSN = process.env.DUCKBUG_TEST_DSN?.trim();
const EXPECT_LIVE = process.env.DUCKBUG_EXPECT_LIVE_INGEST === "1";

if (EXPECT_LIVE && !LIVE_DSN) {
  describe("Live ingest (env DUCKBUG_TEST_DSN)", () => {
    it("requires DUCKBUG_TEST_DSN", () => {
      throw new Error(missingLiveDsnMessage());
    });
  });
} else {
  describe.skipIf(!LIVE_DSN)("Live ingest (env DUCKBUG_TEST_DSN)", () => {
    it("sends a full log (all shared fields + dTags) without transport error", async () => {
      const dsn = LIVE_DSN as string;
      parseDuckBugIngestDsn(dsn);

      let failure: { message: string } | undefined;
      const provider = new DuckBugProvider({
        dsn,
        transport: { maxRetries: 0 },
        onTransportError: (info) => {
          failure = info;
        },
      });

      const time = Date.now();
      provider.sendLog(buildFullLiveLog(time));

      await provider.flush();

      expect(failure).toBeUndefined();
    });

    it("sends a full error (all shared fields + dTags) without transport error", async () => {
      const dsn = LIVE_DSN as string;
      parseDuckBugIngestDsn(dsn);

      let failure: { message: string } | undefined;
      const provider = new DuckBugProvider({
        dsn,
        transport: { maxRetries: 0 },
        onTransportError: (info) => {
          failure = info;
        },
      });

      const time = Date.now();
      provider.sendError(buildFullLiveError(time));

      await provider.flush();

      expect(failure).toBeUndefined();
    });
  });
}
