import type { DuckSDK } from "../SDK/DuckSDK";

export type NodeGlobalErrorIntegrationOptions = {
  duck: DuckSDK;
  /** Tag passed to `quack` for unhandled errors. Default `"unhandledRejection"` / `"uncaughtException"`. */
  rejectionTag?: string;
  exceptionTag?: string;
};

/**
 * Registers one-shot handlers for `unhandledRejection` and `uncaughtException`.
 * Core stays framework-free; opt in via this helper.
 */
export function registerNodeGlobalErrorHandlers(
  options: NodeGlobalErrorIntegrationOptions,
): () => void {
  const rejectionTag = options.rejectionTag ?? "unhandledRejection";
  const exceptionTag = options.exceptionTag ?? "uncaughtException";

  const onRejection = (reason: unknown) => {
    const err =
      reason instanceof Error
        ? reason
        : new Error(
            typeof reason === "string" ? reason : JSON.stringify(reason),
          );
    options.duck.quack(rejectionTag, err);
    void options.duck.flush();
  };

  const onException = (err: Error) => {
    options.duck.quack(exceptionTag, err);
    void options.duck.flush();
  };

  process.on("unhandledRejection", onRejection);
  process.on("uncaughtException", onException);

  return () => {
    process.off("unhandledRejection", onRejection);
    process.off("uncaughtException", onException);
  };
}
