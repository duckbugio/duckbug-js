function randomEventId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  throw new Error(
    "crypto.randomUUID is not available; use a runtime with Web Crypto or set eventId on events explicitly",
  );
}

/** Assigns a stable UUID when missing (idempotency / retries). */
export function ensureEventId<E extends { eventId?: string }>(event: E): E {
  if (event.eventId !== undefined && event.eventId !== "") {
    return event;
  }
  return { ...event, eventId: randomEventId() };
}
