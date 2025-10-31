import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DuckBugProvider } from "../src/DuckBug/DuckBugProvider";
import { DuckSDK } from "../src/SDK/DuckSDK";
import { logLevel } from "../src/SDK/LogLevel";
import type { LogProviderConfig } from "../src/SDK/LogProviderConfig";

//@ts-ignore
global.fetch = vi.fn();

describe("DuckBug Integration Tests", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let duckBugProvider: DuckBugProvider;
  let sdk: DuckSDK;
  let originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  };

  beforeEach(() => {
    // Store original console methods
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    // Mock fetch
    mockFetch = vi.mocked(fetch);
    mockFetch.mockClear();
    mockFetch.mockResolvedValue(new Response("OK", { status: 200 }));

    // Create DuckBug provider
    duckBugProvider = new DuckBugProvider({
      dsn: "https://api.duckbug.test",
    });

    // Mock console methods
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe("End-to-End Logging Flow", () => {
    it("should handle complete logging workflow", async () => {
      const logProviderConfig: LogProviderConfig = {
        logReports: {
          log: true,
          warn: true,
          error: true,
        },
      };

      // Initialize SDK with DuckBug provider
      sdk = new DuckSDK([duckBugProvider], logProviderConfig);

      // Test direct SDK methods
      sdk.log("SDK_LOG", { user: "test" });
      sdk.warn("SDK_WARN", { warning: "test warning" });
      sdk.error("SDK_ERROR", { error: "test error" });
      sdk.debug("SDK_DEBUG", { debug: "test debug" });
      sdk.fatal("SDK_FATAL", { fatal: "test fatal" });

      // Verify API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(5);

      // Verify log endpoint calls
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.duckbug.test/logs",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("SDK_LOG"),
        }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.duckbug.test/logs",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("SDK_WARN"),
        }),
      );
    });

    it("should handle console override integration", () => {
      const logProviderConfig: LogProviderConfig = {
        logReports: {
          log: true,
          warn: true,
          error: true,
        },
      };

      // Initialize SDK with console overrides
      sdk = new DuckSDK([duckBugProvider], logProviderConfig);

      // Test console methods (should be overridden)
      console.log("Console log message", { data: "test" });
      console.warn("Console warn message", { warning: "test" });
      console.error("Console error message", { error: "test" });

      // Verify API calls were made for console methods
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify the correct data was sent
      const calls = mockFetch.mock.calls;
      const logCall = calls.find((call) =>
        call[1]?.body?.includes("Console log message"),
      );
      const warnCall = calls.find((call) =>
        call[1]?.body?.includes("Console warn message"),
      );
      const errorCall = calls.find((call) =>
        call[1]?.body?.includes("Console error message"),
      );

      expect(logCall).toBeDefined();
      expect(warnCall).toBeDefined();
      expect(errorCall).toBeDefined();
    });

    it("should handle quack method for error reporting", () => {
      sdk = new DuckSDK([duckBugProvider]);

      const testError = new Error("Integration test error");
      testError.stack =
        "Error: Integration test error\n    at integration.test.ts:1:1";

      // Use quack method directly on provider
      duckBugProvider.quack("INTEGRATION_ERROR", testError);

      // Should call errors endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.duckbug.test/errors",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stack: testError.stack,
            message: "INTEGRATION_ERROR",
            context: testError.message,
          }),
        }),
      );
    });
  });

  describe("Multiple Providers Integration", () => {
    it("should work with multiple providers", () => {
      const provider1 = new DuckBugProvider({
        dsn: "https://api1.duckbug.test",
      });

      const provider2 = new DuckBugProvider({
        dsn: "https://api2.duckbug.test",
      });

      sdk = new DuckSDK([provider1, provider2]);

      sdk.log("MULTI_PROVIDER_TEST", { data: "test" });

      // Should make calls to both providers
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api1.duckbug.test/logs",
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api2.duckbug.test/logs",
        expect.any(Object),
      );
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle network failures gracefully", () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      sdk = new DuckSDK([duckBugProvider]);

      // Should not throw even if network fails
      expect(() => {
        sdk.log("NETWORK_ERROR_TEST", { data: "test" });
      }).not.toThrow();

      expect(mockFetch).toHaveBeenCalled();
    });

    it("should handle provider errors gracefully", () => {
      // Create a provider that throws errors
      const errorProvider = {
        log: vi.fn(() => {}),
        warn: vi.fn(),
        error: vi.fn(),
        report: vi.fn(() => {}),
        quack: vi.fn(),
      };

      sdk = new DuckSDK([errorProvider, duckBugProvider]);

      // Should not throw even if one provider fails
      expect(() => {
        sdk.log("PROVIDER_ERROR_TEST", { data: "test" });
      }).not.toThrow();

      // The working provider should still be called
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("Configuration Integration", () => {
    it("should respect log provider configuration", () => {
      const selectiveConfig: LogProviderConfig = {
        logReports: {
          log: false,
          warn: true,
          error: false,
        },
      };

      sdk = new DuckSDK([duckBugProvider], selectiveConfig);

      console.log("Should not be intercepted");
      console.warn("Should be intercepted");
      console.error("Should not be intercepted");

      // Only warn should trigger the provider
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.duckbug.test/logs",
        expect.objectContaining({
          body: expect.stringContaining("Should be intercepted"),
        }),
      );
    });

    it("should handle disabled console overrides", () => {
      const disabledConfig: LogProviderConfig = {
        logReports: {
          log: false,
          warn: false,
          error: false,
        },
      };

      sdk = new DuckSDK([duckBugProvider], disabledConfig);

      console.log("No override");
      console.warn("No override");
      console.error("No override");

      // No API calls should be made
      expect(mockFetch).not.toHaveBeenCalled();

      // But direct SDK methods should still work
      sdk.log("Direct SDK call");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Data Flow Integration", () => {
    it("should maintain data integrity through the entire pipeline", () => {
      sdk = new DuckSDK([duckBugProvider]);

      const testData = {
        userId: 12345,
        action: "button_click",
        metadata: {
          timestamp: Date.now(),
          version: "1.0.0",
        },
        nested: {
          deep: {
            value: "test",
          },
        },
      };

      vi.spyOn(Date, "now").mockReturnValue(1640995200000);

      sdk.warn("DATA_INTEGRITY_TEST", testData);

      expect(mockFetch).toHaveBeenCalledWith("https://api.duckbug.test/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: 1640995200000,
          level: logLevel.WARN,
          message: "DATA_INTEGRITY_TEST",
          context: testData,
        }),
      });
    });

    it("should handle different data types correctly", () => {
      sdk = new DuckSDK([duckBugProvider]);

      vi.spyOn(Date, "now").mockReturnValue(1640995200000);

      //@ts-ignore
      sdk.log("STRING_TEST", "simple string");
      //@ts-ignore
      sdk.log("NUMBER_TEST", 42);
      //@ts-ignore
      sdk.log("BOOLEAN_TEST", true);
      //@ts-ignore
      sdk.log("NULL_TEST", null);
      //@ts-ignore
      sdk.log("UNDEFINED_TEST", undefined);
      //@ts-ignore
      sdk.log("ARRAY_TEST", [1, 2, 3]);

      expect(mockFetch).toHaveBeenCalledTimes(6);

      // Verify each call has the correct data
      const calls = mockFetch.mock.calls;
      expect(calls[0][1]?.body).toContain(
        JSON.stringify({
          time: 1640995200000,
          level: "DEBUG",
          message: "STRING_TEST",
          context: "simple string",
        }),
      );
      expect(calls[1][1]?.body).toContain(
        JSON.stringify({
          time: 1640995200000,
          level: "DEBUG",
          message: "NUMBER_TEST",
          context: 42,
        }),
      );
      expect(calls[2][1]?.body).toContain(
        JSON.stringify({
          time: 1640995200000,
          level: "DEBUG",
          message: "BOOLEAN_TEST",
          context: true,
        }),
      );
      expect(calls[3][1]?.body).toContain(
        JSON.stringify({
          time: 1640995200000,
          level: "DEBUG",
          message: "NULL_TEST",
          context: null,
        }),
      );
      expect(calls[4][1]?.body).toContain(
        JSON.stringify({
          time: 1640995200000,
          level: "DEBUG",
          message: "UNDEFINED_TEST",
          context: undefined,
        }),
      );
      expect(calls[5][1]?.body).toContain(
        JSON.stringify({
          time: 1640995200000,
          level: "DEBUG",
          message: "ARRAY_TEST",
          context: [1, 2, 3],
        }),
      );
    });
  });

  describe("Real-world Usage Scenarios", () => {
    it("should handle typical application logging scenario", () => {
      const config: LogProviderConfig = {
        logReports: {
          log: true,
          warn: true,
          error: true,
        },
      };

      sdk = new DuckSDK([duckBugProvider], config);

      // Simulate typical application flow
      console.log("Application started");
      sdk.log("USER_LOGIN", { userId: 123, timestamp: Date.now() });
      console.warn("Performance warning: slow query");
      sdk.warn("SLOW_QUERY", { query: "SELECT * FROM users", duration: 1500 });

      try {
        throw new Error("Simulated error");
      } catch (error) {
        console.error("An error occurred:", error);
        duckBugProvider.quack("APPLICATION_ERROR", error as Error);
      }

      // Verify all expected calls were made
      expect(mockFetch).toHaveBeenCalledTimes(6); // 4 logs + 1 error

      const logCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === "https://api.duckbug.test/logs",
      );
      const errorCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === "https://api.duckbug.test/errors",
      );

      expect(logCalls).toHaveLength(5);
      expect(errorCalls).toHaveLength(1);
    });

    it("should handle high-frequency logging", () => {
      sdk = new DuckSDK([duckBugProvider]);

      // Simulate high-frequency logging
      for (let i = 0; i < 100; i++) {
        sdk.log(`HIGH_FREQ_${i}`, { iteration: i });
      }

      expect(mockFetch).toHaveBeenCalledTimes(100);
    });
  });

  describe("Edge Cases Integration", () => {
    it("should handle empty and null configurations", () => {
      // Test with minimal configuration
      const minimalProvider = new DuckBugProvider({ dsn: "" });
      sdk = new DuckSDK([minimalProvider]);

      sdk.log("MINIMAL_CONFIG_TEST");

      expect(mockFetch).toHaveBeenCalledWith(
        "/logs", // Empty DSN results in relative URL
        expect.any(Object),
      );
    });

    it("should handle concurrent operations", async () => {
      sdk = new DuckSDK([duckBugProvider]);

      // Simulate concurrent logging
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(sdk.log(`CONCURRENT_${i}`, { index: i })),
      );

      await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(10);
    });
  });
});
