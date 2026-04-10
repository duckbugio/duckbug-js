import type { IngestJsonValue, IngestSharedMetadata } from "../contract";

/**
 * Reserved key on the second argument to `Duck` / `DuckSDK` log methods.
 * Not sent inside `context` on the wire.
 */
export type DuckReservedMeta = {
  dTags?: string[];
  /** One-shot metadata merged into this log only (after global `setScope`, before fixed fields). */
  scope?: Partial<IngestSharedMetadata>;
};

export type DuckLogPayload = Record<string, unknown> & {
  _duck?: DuckReservedMeta;
};

/** Log event fields applied by emitLog; strip if passed via `_duck.scope`. */
const EMIT_OWNED = ["time", "level", "message", "sdk"] as const;

/**
 * Splits the optional second argument into scope-like fields, `dTags`, and `context`.
 * - Plain object: strips `_duck`, remaining keys become `context` if non-empty.
 * - Non-plain-object payload: entire value becomes `context` (legacy).
 */
export function parseDuckLogPayload(payload: object | undefined): {
  scopePatch: Partial<IngestSharedMetadata>;
  context: IngestJsonValue | undefined;
  dTags: string[] | undefined;
} {
  if (payload === undefined) {
    return { scopePatch: {}, context: undefined, dTags: undefined };
  }
  // `typeof null === "object"` — treat null like other non-object contexts.
  if (
    payload === null ||
    Array.isArray(payload) ||
    typeof payload !== "object"
  ) {
    return {
      scopePatch: {},
      context: payload as IngestJsonValue,
      dTags: undefined,
    };
  }

  const rec = { ...(payload as Record<string, unknown>) };
  const rawDuck = rec._duck;
  delete rec._duck;

  let reserved: DuckReservedMeta | undefined;
  if (
    rawDuck !== null &&
    typeof rawDuck === "object" &&
    !Array.isArray(rawDuck)
  ) {
    reserved = rawDuck as DuckReservedMeta;
  }

  const hasRest = Object.keys(rec).length > 0;
  const restContext = hasRest ? (rec as IngestJsonValue) : undefined;

  let scopeContext: IngestJsonValue | undefined;
  let scopePatch: Partial<IngestSharedMetadata> = {};
  const inner = reserved?.scope;
  if (
    inner !== undefined &&
    typeof inner === "object" &&
    !Array.isArray(inner)
  ) {
    const s = inner as IngestSharedMetadata & { context?: IngestJsonValue };
    scopeContext = s.context;
    const { context: _c, ...restScope } = s;
    scopePatch = { ...restScope };
  }

  for (const k of EMIT_OWNED) {
    delete (scopePatch as Record<string, unknown>)[k];
  }

  let context: IngestJsonValue | undefined;
  if (hasRest) {
    context = restContext;
  } else if (scopeContext !== undefined) {
    context = scopeContext;
  }

  let dTags: string[] | undefined;
  if (reserved?.dTags !== undefined) {
    dTags = reserved.dTags;
  } else if (scopePatch.dTags !== undefined) {
    dTags = scopePatch.dTags;
  }

  const { dTags: _scopeDtags, ...scopePatchNoDtags } = scopePatch;

  return {
    scopePatch: scopePatchNoDtags,
    context,
    dTags,
  };
}
