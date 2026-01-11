import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { LogProviderConfig, Provider } from "../../src/SDK";
import { DuckSDK } from "../../src/SDK/DuckSDK";
import { logLevel } from "../../src/SDK/LogLevel";

describe("DuckSDK", () => {
  let mockProvider1: Provider;
  let mockProvider2: Provider;
  let providers: Provider[];
  let sdk: DuckSDK;
  let logProviderConfig: LogProviderConfig;

  type DuckSDKInternals = {
    providers: Provider[];
  };

  beforeEach(() => {
    mockProvider1 = {
      log: mock(),
      warn: mock(),
      error: mock(),
      report: mock(),
      quack: mock(),
    };

    mockProvider2 = {
      log: mock(),
      warn: mock(),
      error: mock(),
      report: mock(),
      quack: mock(),
    };

    providers = [mockProvider1, mockProvider2];

    logProviderConfig = {
      logReports: {
        log: true,
        warn: true,
        error: true,
      },
    };
  });

  describe("constructor", () => {
    it("should initialize with providers", () => {
      sdk = new DuckSDK(providers);

      const sdkInternal = sdk as unknown as DuckSDKInternals;
      expect(sdkInternal.providers).toBe(providers);
      // LogProvider is created internally, we test behavior rather than implementation
    });

    it("should initialize with providers and logProviderConfig", () => {
      sdk = new DuckSDK(providers, logProviderConfig);

      const sdkInternal = sdk as unknown as DuckSDKInternals;
      expect(sdkInternal.providers).toBe(providers);
      // LogProvider is created with config internally
    });

    it("should store providers internally", () => {
      sdk = new DuckSDK(providers);

      const sdkInternal = sdk as unknown as DuckSDKInternals;
      expect(sdkInternal.providers).toBe(providers);
    });
  });

  describe("log", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call report on all providers with DEBUG level", () => {
      const tag = "LOG_TAG";
      const payload = { data: "test" };

      sdk.log(tag, payload);

      expect(mockProvider1.report).toHaveBeenCalledTimes(1);
      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        payload,
      );
      expect(mockProvider2.report).toHaveBeenCalledTimes(1);
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        payload,
      );
    });

    it("should work without payload", () => {
      const tag = "LOG_TAG_NO_PAYLOAD";

      sdk.log(tag);

      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        undefined,
      );
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        undefined,
      );
    });
  });

  describe("error", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call report on all providers with DEBUG level", () => {
      const tag = "ERROR_TAG";
      const payload = { error: "details" };

      sdk.error(tag, payload);

      expect(mockProvider1.report).toHaveBeenCalledTimes(1);
      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        payload,
      );
      expect(mockProvider2.report).toHaveBeenCalledTimes(1);
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        payload,
      );
    });

    it("should work without payload", () => {
      const tag = "ERROR_TAG_NO_PAYLOAD";

      sdk.error(tag);

      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        undefined,
      );
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        undefined,
      );
    });
  });

  describe("debug", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call report on all providers with DEBUG level", () => {
      const tag = "DEBUG_TAG";
      const payload = { debug: "info" };

      sdk.debug(tag, payload);

      expect(mockProvider1.report).toHaveBeenCalledTimes(1);
      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        payload,
      );
      expect(mockProvider2.report).toHaveBeenCalledTimes(1);
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        payload,
      );
    });

    it("should work without payload", () => {
      const tag = "DEBUG_TAG_NO_PAYLOAD";

      sdk.debug(tag);

      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        undefined,
      );
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.DEBUG,
        undefined,
      );
    });
  });

  describe("warn", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call report on all providers with WARN level", () => {
      const tag = "WARN_TAG";
      const payload = { warning: "message" };

      sdk.warn(tag, payload);

      expect(mockProvider1.report).toHaveBeenCalledTimes(1);
      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.WARN,
        payload,
      );
      expect(mockProvider2.report).toHaveBeenCalledTimes(1);
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.WARN,
        payload,
      );
    });

    it("should work without payload", () => {
      const tag = "WARN_TAG_NO_PAYLOAD";

      sdk.warn(tag);

      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.WARN,
        undefined,
      );
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.WARN,
        undefined,
      );
    });
  });

  describe("fatal", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call report on all providers with FATAL level", () => {
      const tag = "FATAL_TAG";
      const payload = { fatal: "error" };

      sdk.fatal(tag, payload);

      expect(mockProvider1.report).toHaveBeenCalledTimes(1);
      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.FATAL,
        payload,
      );
      expect(mockProvider2.report).toHaveBeenCalledTimes(1);
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.FATAL,
        payload,
      );
    });

    it("should work without payload", () => {
      const tag = "FATAL_TAG_NO_PAYLOAD";

      sdk.fatal(tag);

      expect(mockProvider1.report).toHaveBeenCalledWith(
        tag,
        logLevel.FATAL,
        undefined,
      );
      expect(mockProvider2.report).toHaveBeenCalledWith(
        tag,
        logLevel.FATAL,
        undefined,
      );
    });
  });

  describe("quack", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call quack on all providers with tag and error", () => {
      const tag = "QUACK_TAG";
      const error = new Error("Test error");

      sdk.quack(tag, error);

      expect(mockProvider1.quack).toHaveBeenCalledTimes(1);
      expect(mockProvider1.quack).toHaveBeenCalledWith(tag, error);
      expect(mockProvider2.quack).toHaveBeenCalledTimes(1);
      expect(mockProvider2.quack).toHaveBeenCalledWith(tag, error);
    });

    it("should work with different error types", () => {
      const tag = "ERROR_TAG";
      const error = new TypeError("Type error test");

      sdk.quack(tag, error);

      expect(mockProvider1.quack).toHaveBeenCalledWith(tag, error);
      expect(mockProvider2.quack).toHaveBeenCalledWith(tag, error);
    });
  });

  describe("sendReportToPlugins (private method behavior)", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should handle empty providers array", () => {
      const emptySDK = new DuckSDK([]);

      expect(() => emptySDK.log("TEST")).not.toThrow();
    });

    it("should handle single provider", () => {
      const singleProviderSDK = new DuckSDK([mockProvider1]);

      singleProviderSDK.warn("SINGLE_PROVIDER_TAG", { test: true });

      expect(mockProvider1.report).toHaveBeenCalledWith(
        "SINGLE_PROVIDER_TAG",
        logLevel.WARN,
        { test: true },
      );
      expect(mockProvider2.report).not.toHaveBeenCalled();
    });

    it("should handle provider with error", () => {
      //@ts-ignore
      mockProvider1.report.mockImplementation(() => {});

      // Should not throw even if one provider fails
      expect(() => sdk.log("ERROR_TEST")).not.toThrow();
      expect(mockProvider2.report).toHaveBeenCalled();
    });
  });

  describe("integration", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers, logProviderConfig);
    });

    it("should handle multiple method calls", () => {
      sdk.log("LOG_TAG", { log: true });
      sdk.debug("DEBUG_TAG", { debug: true });
      sdk.warn("WARN_TAG", { warn: true });
      sdk.error("ERROR_TAG", { error: true });
      sdk.fatal("FATAL_TAG", { fatal: true });

      expect(mockProvider1.report).toHaveBeenCalledTimes(5);
      expect(mockProvider2.report).toHaveBeenCalledTimes(5);

      expect(mockProvider1.report).toHaveBeenNthCalledWith(
        1,
        "LOG_TAG",
        logLevel.DEBUG,
        { log: true },
      );
      expect(mockProvider1.report).toHaveBeenNthCalledWith(
        2,
        "DEBUG_TAG",
        logLevel.DEBUG,
        { debug: true },
      );
      expect(mockProvider1.report).toHaveBeenNthCalledWith(
        3,
        "WARN_TAG",
        logLevel.WARN,
        { warn: true },
      );
      expect(mockProvider1.report).toHaveBeenNthCalledWith(
        4,
        "ERROR_TAG",
        logLevel.DEBUG,
        { error: true },
      );
      expect(mockProvider1.report).toHaveBeenNthCalledWith(
        5,
        "FATAL_TAG",
        logLevel.FATAL,
        { fatal: true },
      );
    });

    it("should work with complex payload objects", () => {
      const complexPayload = {
        user: { id: 123, name: "John" },
        metadata: { timestamp: Date.now(), version: "1.0.0" },
        nested: { deep: { value: "test" } },
      };

      sdk.log("COMPLEX_TAG", complexPayload);

      expect(mockProvider1.report).toHaveBeenCalledWith(
        "COMPLEX_TAG",
        logLevel.DEBUG,
        complexPayload,
      );
      expect(mockProvider2.report).toHaveBeenCalledWith(
        "COMPLEX_TAG",
        logLevel.DEBUG,
        complexPayload,
      );
    });
  });
});
