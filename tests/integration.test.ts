import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { DuckBugProvider } from "../src/DuckBug/DuckBugProvider";
import { DuckSDK } from "../src/SDK/DuckSDK";
import { logLevel } from "../src/SDK/LogLevel";
import type { LogProviderConfig } from "../src/SDK/LogProviderConfig";

const INGEST_DSN = "https://api.duckbug.test/ingest/demo:secretkey";
const LOGS_URL = `${new URL(INGEST_DSN).origin}/ingest/demo:secretkey/logs`;
const ERRORS_URL = `${new URL(INGEST_DSN).origin}/ingest/demo:secretkey/errors`;

//@ts-ignore
global.fetch = mock(() => Promise.resolve(new Response("OK", { status: 200 })));

describe("DuckBug Integration Tests", () => {
  let mockFetch: ReturnType<typeof mock>;
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
    mockFetch = fetch as ReturnType<typeof mock>;
    mockFetch.mockClear();
    mockFetch.mockResolvedValue(new Response("OK", { status: 200 }));

    // Create DuckBug provider
    duckBugProvider = new DuckBugProvider({
      dsn: INGEST_DSN,
    });

    // Mock console methods
    console.log = mock(() => {});
    console.warn = mock(() => {});
    console.error = mock(() => {});
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

      await sdk.flush();

      // Verify API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(5);

      // Verify log endpoint calls
      expect(mockFetch).toHaveBeenCalledWith(
        LOGS_URL,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("SDK_LOG"),
        }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        LOGS_URL,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("SDK_WARN"),
        }),
      );
    });

    it("should handle console override integration", async () => {
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

      await sdk.flush();

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

    it("should handle quack method for error reporting", async () => {
      sdk = new DuckSDK([duckBugProvider]);

      const testError = new Error("Integration test error");
      testError.stack =
        "Error: Integration test error\n    at integration.test.ts:1:1";

      // Use quack method directly on provider
      duckBugProvider.quack("INTEGRATION_ERROR", testError);

      await duckBugProvider.flush();

      // Should call errors endpoint
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe(ERRORS_URL);
      expect(callArgs[1]?.method).toBe("POST");
      expect(callArgs[1]?.headers).toEqual({
        "Content-Type": "application/json",
      });
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      expect(requestBody.message).toBe("Integration test error");
      expect(requestBody.dTags).toEqual(["INTEGRATION_ERROR"]);
      expect(requestBody.stacktrace.raw).toBe(testError.stack);
    });
  });

  describe("Multiple Providers Integration", () => {
    it("should work with multiple providers", async () => {
      const provider1 = new DuckBugProvider({
        dsn: "https://api1.duckbug.test/ingest/a:1",
      });

      const provider2 = new DuckBugProvider({
        dsn: "https://api2.duckbug.test/ingest/b:2",
      });

      sdk = new DuckSDK([provider1, provider2]);

      sdk.log("MULTI_PROVIDER_TEST", { data: "test" });

      await sdk.flush();

      // Should make calls to both providers
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api1.duckbug.test/ingest/a:1/logs",
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api2.duckbug.test/ingest/b:2/logs",
        expect.any(Object),
      );
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle network failures gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const fragile = new DuckBugProvider({
        dsn: INGEST_DSN,
        transport: { maxRetries: 0 },
      });
      sdk = new DuckSDK([fragile]);

      // Should not throw even if network fails
      expect(() => {
        sdk.log("NETWORK_ERROR_TEST", { data: "test" });
      }).not.toThrow();

      await sdk.flush();
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should handle provider errors gracefully", async () => {
      // Create a provider that throws errors
      const errorProvider = {
        sendLog: mock(() => {}),
        sendError: mock(),
        log: mock(() => {}),
        warn: mock(),
        error: mock(),
      };

      sdk = new DuckSDK([errorProvider, duckBugProvider]);

      // Should not throw even if one provider fails
      expect(() => {
        sdk.log("PROVIDER_ERROR_TEST", { data: "test" });
      }).not.toThrow();

      await sdk.flush();

      // The working provider should still be called
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("Configuration Integration", () => {
    it("should respect log provider configuration", async () => {
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

      await sdk.flush();

      // Only warn should trigger the provider
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        LOGS_URL,
        expect.objectContaining({
          body: expect.stringContaining("Should be intercepted"),
        }),
      );
    });

    it("should handle disabled console overrides", async () => {
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
      await sdk.flush();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Data Flow Integration", () => {
    it("should maintain data integrity through the entire pipeline", async () => {
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

      spyOn(Date, "now").mockReturnValue(1640995200000);

      sdk.warn("DATA_INTEGRITY_TEST", testData);

      await sdk.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        LOGS_URL,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body).toEqual(
        expect.objectContaining({
          time: 1640995200000,
          level: logLevel.WARN,
          message: "DATA_INTEGRITY_TEST",
          platform: "node",
          sdk: { name: "@duckbug/js", version: "0.1.3" },
          context: testData,
          eventId: expect.any(String),
        }),
      );
    });

    it("should handle different data types correctly", async () => {
      sdk = new DuckSDK([duckBugProvider]);

      spyOn(Date, "now").mockReturnValue(1640995200000);

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

      await sdk.flush();

      expect(mockFetch).toHaveBeenCalledTimes(6);

      // Verify each call has the correct data
      const calls = mockFetch.mock.calls;
      expect(JSON.parse(calls[0][1]?.body as string)).toEqual(
        expect.objectContaining({
          time: 1640995200000,
          level: "DEBUG",
          message: "STRING_TEST",
          platform: "node",
          context: "simple string",
          eventId: expect.any(String),
        }),
      );
      expect(JSON.parse(calls[1][1]?.body as string)).toEqual(
        expect.objectContaining({
          message: "NUMBER_TEST",
          context: 42,
        }),
      );
      expect(JSON.parse(calls[2][1]?.body as string)).toEqual(
        expect.objectContaining({
          message: "BOOLEAN_TEST",
          context: true,
        }),
      );
      expect(JSON.parse(calls[3][1]?.body as string)).toEqual(
        expect.objectContaining({
          message: "NULL_TEST",
          context: null,
        }),
      );
      expect(JSON.parse(calls[4][1]?.body as string)).toEqual(
        expect.objectContaining({
          time: 1640995200000,
          level: "DEBUG",
          message: "UNDEFINED_TEST",
        }),
      );
      expect(JSON.parse(calls[4][1]?.body as string).context).toBeUndefined();
      expect(JSON.parse(calls[5][1]?.body as string)).toEqual(
        expect.objectContaining({
          message: "ARRAY_TEST",
          context: [1, 2, 3],
        }),
      );
    });
  });

  describe("Real-world Usage Scenarios", () => {
    it("should handle typical application logging scenario", async () => {
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

      await sdk.flush();
      await duckBugProvider.flush();

      // Verify all expected calls were made
      expect(mockFetch).toHaveBeenCalledTimes(6); // 4 logs + 1 error

      const logCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === LOGS_URL,
      );
      const errorCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === ERRORS_URL,
      );

      expect(logCalls).toHaveLength(5);
      expect(errorCalls).toHaveLength(1);
    });

    it("should handle high-frequency logging", async () => {
      sdk = new DuckSDK([duckBugProvider]);

      // Simulate high-frequency logging
      for (let i = 0; i < 100; i++) {
        sdk.log(`HIGH_FREQ_${i}`, { iteration: i });
      }

      await sdk.flush();
      expect(mockFetch).toHaveBeenCalledTimes(100);
    });
  });

  describe("Edge Cases Integration", () => {
    it("should reject invalid DSN", () => {
      expect(() => new DuckBugProvider({ dsn: "" })).toThrow(
        "Invalid DuckBug DSN",
      );
    });

    it("should handle concurrent operations", async () => {
      sdk = new DuckSDK([duckBugProvider]);

      // Simulate concurrent logging
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(sdk.log(`CONCURRENT_${i}`, { index: i })),
      );

      await Promise.all(promises);
      await sdk.flush();

      expect(mockFetch).toHaveBeenCalledTimes(10);
    });
  });
});
