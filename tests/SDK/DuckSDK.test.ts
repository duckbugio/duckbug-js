import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { LogProviderConfig, Provider } from "../../src/SDK";
import { Duck, DuckSDK } from "../../src/SDK/DuckSDK";
import { logLevel } from "../../src/SDK/LogLevel";

function createMockProvider(): Provider {
  return {
    sendLog: mock(),
    sendError: mock(),
    log: mock(),
    warn: mock(),
    error: mock(),
  };
}

/** Second argument passed by DuckSDK after core finalize pipeline. */
const SDK_SKIP_PIPELINE = { skipPrivacyPipeline: true as const };

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
    mockProvider1 = createMockProvider();
    mockProvider2 = createMockProvider();
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
    });

    it("should initialize with providers and logProviderConfig", () => {
      sdk = new DuckSDK(providers, logProviderConfig);

      const sdkInternal = sdk as unknown as DuckSDKInternals;
      expect(sdkInternal.providers).toBe(providers);
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

    it("should call sendLog on all providers with DEBUG level", () => {
      const tag = "LOG_TAG";
      const payload = { data: "test" };

      sdk.log(tag, payload);

      expect(mockProvider1.sendLog).toHaveBeenCalledTimes(1);
      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: logLevel.DEBUG,
          message: tag,
          context: payload,
        }),
        SDK_SKIP_PIPELINE,
      );
      expect(mockProvider2.sendLog).toHaveBeenCalledTimes(1);
    });

    it("should work without payload", () => {
      const tag = "LOG_TAG_NO_PAYLOAD";

      sdk.log(tag);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: tag,
          level: logLevel.DEBUG,
        }),
        SDK_SKIP_PIPELINE,
      );
      expect(
        (mockProvider1.sendLog as ReturnType<typeof mock>).mock.calls[0][0]
          .context,
      ).toBeUndefined();
    });
  });

  describe("error", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call sendLog on all providers with ERROR level", () => {
      const tag = "ERROR_TAG";
      const payload = { error: "details" };

      sdk.error(tag, payload);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: logLevel.ERROR,
          message: tag,
          context: payload,
        }),
        SDK_SKIP_PIPELINE,
      );
    });

    it("should work without payload", () => {
      const tag = "ERROR_TAG_NO_PAYLOAD";

      sdk.error(tag);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: tag,
          level: logLevel.ERROR,
        }),
        SDK_SKIP_PIPELINE,
      );
    });
  });

  describe("debug", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call sendLog on all providers with DEBUG level", () => {
      const tag = "DEBUG_TAG";
      const payload = { debug: "info" };

      sdk.debug(tag, payload);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: logLevel.DEBUG,
          message: tag,
          context: payload,
        }),
        SDK_SKIP_PIPELINE,
      );
    });

    it("should work without payload", () => {
      const tag = "DEBUG_TAG_NO_PAYLOAD";

      sdk.debug(tag);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: tag,
          level: logLevel.DEBUG,
        }),
        SDK_SKIP_PIPELINE,
      );
    });
  });

  describe("warn", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call sendLog on all providers with WARN level", () => {
      const tag = "WARN_TAG";
      const payload = { warning: "message" };

      sdk.warn(tag, payload);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: logLevel.WARN,
          message: tag,
          context: payload,
        }),
        SDK_SKIP_PIPELINE,
      );
    });

    it("should work without payload", () => {
      const tag = "WARN_TAG_NO_PAYLOAD";

      sdk.warn(tag);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: tag,
          level: logLevel.WARN,
        }),
        SDK_SKIP_PIPELINE,
      );
    });
  });

  describe("fatal", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call sendLog on all providers with FATAL level", () => {
      const tag = "FATAL_TAG";
      const payload = { fatal: "error" };

      sdk.fatal(tag, payload);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: logLevel.FATAL,
          message: tag,
          context: payload,
        }),
        SDK_SKIP_PIPELINE,
      );
    });

    it("should work without payload", () => {
      const tag = "FATAL_TAG_NO_PAYLOAD";

      sdk.fatal(tag);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: tag,
          level: logLevel.FATAL,
        }),
        SDK_SKIP_PIPELINE,
      );
    });
  });

  describe("quack", () => {
    beforeEach(() => {
      sdk = new DuckSDK(providers);
    });

    it("should call sendError on all providers with built event", () => {
      const tag = "QUACK_TAG";
      const error = new Error("Test error");

      sdk.quack(tag, error);

      expect(mockProvider1.sendError).toHaveBeenCalledTimes(1);
      expect(mockProvider1.sendError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test error",
          dTags: [tag],
        }),
        SDK_SKIP_PIPELINE,
      );
      expect(mockProvider2.sendError).toHaveBeenCalledTimes(1);
    });

    it("should work with different error types", () => {
      const tag = "ERROR_TAG";
      const error = new TypeError("Type error test");

      sdk.quack(tag, error);

      expect(mockProvider1.sendError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Type error test",
          dTags: [tag],
        }),
        SDK_SKIP_PIPELINE,
      );
    });
  });

  describe("emit to providers", () => {
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

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "SINGLE_PROVIDER_TAG",
          level: logLevel.WARN,
          context: { test: true },
        }),
        SDK_SKIP_PIPELINE,
      );
      expect(mockProvider2.sendLog).not.toHaveBeenCalled();
    });

    it("should handle provider with error", () => {
      (mockProvider1.sendLog as ReturnType<typeof mock>).mockImplementation(
        () => {},
      );

      expect(() => sdk.log("ERROR_TEST")).not.toThrow();
      expect(mockProvider2.sendLog).toHaveBeenCalledWith(
        expect.anything(),
        SDK_SKIP_PIPELINE,
      );
    });
  });

  describe("Duck.captureException", () => {
    it("delegates to quack with default tag", () => {
      const duck = new Duck(providers);
      const err = new Error("cap");
      duck.captureException(err);
      expect(mockProvider1.sendError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "cap",
          dTags: ["error"],
        }),
        SDK_SKIP_PIPELINE,
      );
    });

    it("passes custom tag to quack", () => {
      const duck = new Duck(providers);
      duck.captureException(new Error("x"), "my_tag");
      expect(mockProvider1.sendError).toHaveBeenCalledWith(
        expect.objectContaining({ dTags: ["my_tag"] }),
        SDK_SKIP_PIPELINE,
      );
    });
  });

  describe("beforeSend", () => {
    it("drops event when hook returns null", () => {
      sdk = new DuckSDK(providers, undefined, {
        beforeSend: () => null,
      });
      sdk.log("dropped");
      expect(mockProvider1.sendLog).not.toHaveBeenCalled();
    });

    it("mutates log when hook returns new object", () => {
      sdk = new DuckSDK(providers, undefined, {
        beforeSend: (arg) =>
          arg.kind === "log" ? { ...arg.event, message: "patched" } : arg.event,
      });
      sdk.log("orig");
      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({ message: "patched" }),
        SDK_SKIP_PIPELINE,
      );
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

      expect(mockProvider1.sendLog).toHaveBeenCalledTimes(5);

      expect(mockProvider1.sendLog).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          message: "LOG_TAG",
          level: logLevel.DEBUG,
          context: { log: true },
        }),
        SDK_SKIP_PIPELINE,
      );
      expect(mockProvider1.sendLog).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          message: "DEBUG_TAG",
          level: logLevel.DEBUG,
          context: { debug: true },
        }),
        SDK_SKIP_PIPELINE,
      );
      expect(mockProvider1.sendLog).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          message: "WARN_TAG",
          level: logLevel.WARN,
          context: { warn: true },
        }),
        SDK_SKIP_PIPELINE,
      );
      expect(mockProvider1.sendLog).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          message: "ERROR_TAG",
          level: logLevel.ERROR,
          context: { error: true },
        }),
        SDK_SKIP_PIPELINE,
      );
      expect(mockProvider1.sendLog).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({
          message: "FATAL_TAG",
          level: logLevel.FATAL,
          context: { fatal: true },
        }),
        SDK_SKIP_PIPELINE,
      );
    });

    it("should work with complex payload objects", () => {
      const complexPayload = {
        user: { id: 123, name: "John" },
        metadata: { timestamp: Date.now(), version: "1.0.0" },
        nested: {
          deep: {
            value: "test",
          },
        },
      };

      sdk.log("COMPLEX_TAG", complexPayload);

      expect(mockProvider1.sendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "COMPLEX_TAG",
          level: logLevel.DEBUG,
          context: complexPayload,
        }),
        SDK_SKIP_PIPELINE,
      );
    });
  });
});
