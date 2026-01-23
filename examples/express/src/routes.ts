import { type Request, type Response, Router } from "express";
import { duck } from "./duckbug";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  duck.log("Health check", { endpoint: "/" });
  res.json({ message: "DuckBug.js Express Example is running!" });
});

router.get("/log", (_req: Request, res: Response) => {
  duck.log("Test log", { level: "log", timestamp: Date.now() });
  res.json({ message: "Log sent" });
});

router.get("/debug", (_req: Request, res: Response) => {
  duck.debug("Test debug", { level: "debug", timestamp: Date.now() });
  res.json({ message: "Debug log sent" });
});

router.get("/warn", (_req: Request, res: Response) => {
  duck.warn("Test warning", { level: "warn", timestamp: Date.now() });
  res.json({ message: "Warning log sent" });
});

router.get("/error", (_req: Request, res: Response) => {
  duck.error("Test error", { level: "error", timestamp: Date.now() });
  res.json({ message: "Error log sent" });
});

router.get("/fatal", (_req: Request, res: Response) => {
  duck.fatal("Test fatal", { level: "fatal", timestamp: Date.now() });
  res.json({ message: "Fatal log sent" });
});

router.get("/quack", (_req: Request, res: Response) => {
  const testError = new Error("Test error from Express example");
  testError.stack = `Error: Test error from Express example
    at routes.ts:${Math.floor(Math.random() * 50) + 1}:1`;
  duck.quack("EXPRESS_ERROR", testError);
  res.json({ message: "Error sent via quack" });
});

export default router;
