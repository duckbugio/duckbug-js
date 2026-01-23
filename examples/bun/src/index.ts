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

const PORT = 3000;

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    // Log request
    duck.log("Request", {
      method: req.method,
      path: url.pathname,
      timestamp: Date.now(),
    });

    // Route handling
    if (url.pathname === "/") {
      duck.log("Health check", { endpoint: "/" });
      return new Response(
        JSON.stringify({ message: "DuckBug.js Bun Example is running!" }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (url.pathname === "/log") {
      duck.log("Test log", { level: "log", timestamp: Date.now() });
      return new Response(JSON.stringify({ message: "Log sent" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/debug") {
      duck.debug("Test debug", { level: "debug", timestamp: Date.now() });
      return new Response(JSON.stringify({ message: "Debug log sent" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/warn") {
      duck.warn("Test warning", { level: "warn", timestamp: Date.now() });
      return new Response(JSON.stringify({ message: "Warning log sent" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/error") {
      duck.error("Test error", { level: "error", timestamp: Date.now() });
      return new Response(JSON.stringify({ message: "Error log sent" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/fatal") {
      duck.fatal("Test fatal", { level: "fatal", timestamp: Date.now() });
      return new Response(JSON.stringify({ message: "Fatal log sent" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/quack") {
      const testError = new Error("Test error from Bun example");
      testError.stack = `Error: Test error from Bun example
    at index.ts:${Math.floor(Math.random() * 50) + 1}:1`;
      duck.quack("BUN_ERROR", testError);
      return new Response(JSON.stringify({ message: "Error sent via quack" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 DuckBug.js Bun Example is running on http://localhost:${PORT}`);
