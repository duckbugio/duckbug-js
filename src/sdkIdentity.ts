/** Keep in sync with package.json version when releasing. */
export const SDK_NAME = "@duckbug/js" as const;
export const SDK_VERSION = "0.1.3" as const;

export const SDK_IDENTITY = {
  name: SDK_NAME,
  version: SDK_VERSION,
} as const;
