import { Controller, Get } from "@nestjs/common";
import type { DuckBugService } from "./duckbug/duckbug.service";

@Controller()
export class AppController {
  constructor(private readonly duckBug: DuckBugService) {}

  @Get()
  getHello() {
    this.duckBug.log("Health check", { endpoint: "/" });
    return { message: "DuckBug.js NestJS Example is running!" };
  }

  @Get("log")
  testLog() {
    this.duckBug.log("Test log", { level: "log", timestamp: Date.now() });
    return { message: "Log sent" };
  }

  @Get("debug")
  testDebug() {
    this.duckBug.debug("Test debug", { level: "debug", timestamp: Date.now() });
    return { message: "Debug log sent" };
  }

  @Get("warn")
  testWarn() {
    this.duckBug.warn("Test warning", { level: "warn", timestamp: Date.now() });
    return { message: "Warning log sent" };
  }

  @Get("error")
  testError() {
    this.duckBug.error("Test error", { level: "error", timestamp: Date.now() });
    return { message: "Error log sent" };
  }

  @Get("fatal")
  testFatal() {
    this.duckBug.fatal("Test fatal", { level: "fatal", timestamp: Date.now() });
    return { message: "Fatal log sent" };
  }

  @Get("quack")
  testQuack() {
    const testError = new Error("Test error from NestJS example");
    testError.stack = `Error: Test error from NestJS example
    at AppController.testQuack (app.controller.ts:${Math.floor(Math.random() * 50) + 1}:1)`;
    this.duckBug.quack("NESTJS_ERROR", testError);
    return { message: "Error sent via quack" };
  }
}
