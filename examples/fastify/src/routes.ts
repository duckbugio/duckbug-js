import type { FastifyInstance } from "fastify";
import { duck } from "./duckbug";

export async function routes(fastify: FastifyInstance) {
  fastify.get("/", async () => {
    duck.log("Health check", { endpoint: "/" });
    return { message: "DuckBug.js Fastify Example is running!" };
  });

  fastify.get("/log", async () => {
    duck.log("Test log", { level: "log", timestamp: Date.now() });
    return { message: "Log sent" };
  });

  fastify.get("/debug", async () => {
    duck.debug("Test debug", { level: "debug", timestamp: Date.now() });
    return { message: "Debug log sent" };
  });

  fastify.get("/warn", async () => {
    duck.warn("Test warning", { level: "warn", timestamp: Date.now() });
    return { message: "Warning log sent" };
  });

  fastify.get("/error", async () => {
    duck.error("Test error", { level: "error", timestamp: Date.now() });
    return { message: "Error log sent" };
  });

  fastify.get("/fatal", async () => {
    duck.fatal("Test fatal", { level: "fatal", timestamp: Date.now() });
    return { message: "Fatal log sent" };
  });

  fastify.get("/quack", async () => {
    const testError = new Error("Test error from Fastify example");
    testError.stack = `Error: Test error from Fastify example
    at routes.ts:${Math.floor(Math.random() * 50) + 1}:1`;
    duck.quack("FASTIFY_ERROR", testError);
    return { message: "Error sent via quack" };
  });
}
