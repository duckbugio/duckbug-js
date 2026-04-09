/**
 * Branded context-enrichment surface (duckbug-sdk-spec).
 * Use {@link Pond.ripple} to capture extra sensitive field names for client-side scrubbing.
 */
export const Pond = {
  ripple(extraSensitiveKeys: string[] = []): { extraSensitiveKeys: string[] } {
    return { extraSensitiveKeys: [...extraSensitiveKeys] };
  },
};
