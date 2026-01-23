import { DuckBugProvider, DuckSDK } from "@duckbug/js";

const dsn = process.env.DUCKBUG_DSN || "";

if (!dsn) {
  console.warn("DUCKBUG_DSN is not set. DuckBug logging will not work.");
}

const providers = [
  new DuckBugProvider({
    dsn,
  }),
];

const duck = new DuckSDK(providers, {
  logReports: {
    log: true,
    warn: true,
    error: true,
  },
});

export default duck;
