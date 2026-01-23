import router from "@adonisjs/core/services/router";
import duckBug from "#services/duckbug";

router.get("/", async ({ response }) => {
  duckBug.log("Health check", { endpoint: "/" });
  return response.json({ message: "DuckBug.js AdonisJS Example is running!" });
});

router.get("/log", async ({ response }) => {
  duckBug.log("Test log", { level: "log", timestamp: Date.now() });
  return response.json({ message: "Log sent" });
});

router.get("/debug", async ({ response }) => {
  duckBug.debug("Test debug", { level: "debug", timestamp: Date.now() });
  return response.json({ message: "Debug log sent" });
});

router.get("/warn", async ({ response }) => {
  duckBug.warn("Test warning", { level: "warn", timestamp: Date.now() });
  return response.json({ message: "Warning log sent" });
});

router.get("/error", async ({ response }) => {
  duckBug.error("Test error", { level: "error", timestamp: Date.now() });
  return response.json({ message: "Error log sent" });
});

router.get("/fatal", async ({ response }) => {
  duckBug.fatal("Test fatal", { level: "fatal", timestamp: Date.now() });
  return response.json({ message: "Fatal log sent" });
});

router.get("/quack", async ({ response }) => {
  const testError = new Error("Test error from AdonisJS example");
  testError.stack = `Error: Test error from AdonisJS example
    at routes.ts:${Math.floor(Math.random() * 50) + 1}:1`;
  duckBug.quack("ADONISJS_ERROR", testError);
  return response.json({ message: "Error sent via quack" });
});
