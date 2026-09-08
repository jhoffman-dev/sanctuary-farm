/** The only part of an Express response the liveness probe touches. */
export interface JsonResponder {
  json(body: unknown): void
}

/**
 * Writes the liveness report. Typed against the narrow slice of the request
 * and response it uses — wider than what `onRequest` hands it, so the wiring
 * still typechecks — so a unit test can call it without a fake Express.
 *
 * The body says nothing about the caller: this endpoint is public and the
 * project collects no PII (ADR-0002).
 */
export function respondHealth(_request: unknown, response: JsonResponder): void {
  response.json({ ok: true, service: 'sanctuary-farm-functions' })
}
