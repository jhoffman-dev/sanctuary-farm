/**
 * The checks every hand-edited `@sf/world` document is parsed with. Each one
 * either returns the value, narrowed, or throws a `ParseProblem` naming the
 * path that failed; `parseOrReason` turns that into the `{ ok: false, reason }`
 * the public parsers return, so no parser ever throws on bad input.
 */

export type UnknownRecord = Record<string, unknown>

/** Thrown while walking a document, caught by `parseOrReason` and turned into a reason. */
class ParseProblem extends Error {}

export function fail(path: string, expected: string): never {
  throw new ParseProblem(`${path}: ${expected}`)
}

/**
 * Runs `build` and turns a structural complaint into a reason. Only our own
 * complaints are answers; any other error is a bug in the parser and is rethrown.
 */
export function parseOrReason<T>(build: () => T): { ok: true; value: T } | { ok: false; reason: string } {
  try {
    return { ok: true, value: build() }
  } catch (problem) {
    if (problem instanceof ParseProblem) return { ok: false, reason: problem.message }
    throw problem
  }
}

export function requireRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'expected an object')
  // `__proto__` arrives from JSON.parse as an ordinary own key; copying it would rewrite a prototype.
  if (Object.hasOwn(value, '__proto__')) fail(path, 'forbidden key __proto__')
  return value as UnknownRecord
}

export function requireOnlyKeys(record: UnknownRecord, allowed: readonly string[], path: string): void {
  const unknown = Object.keys(record).find((key) => !allowed.includes(key))
  if (unknown !== undefined) fail(path, `unknown key ${JSON.stringify(unknown)}`)
}

export function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'expected an array')
  return value
}

export function requireFinite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected a finite number')
  return value
}

export function requirePositive(value: unknown, path: string): number {
  const size = requireFinite(value, path)
  if (size <= 0) fail(path, 'expected a number greater than 0')
  return size
}

export function requireInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value)) fail(path, 'expected an integer')
  return value as number
}

/** One of a closed set of strings — a kind, an id, an op. */
export function requireOneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  const found = allowed.find((known) => known === value)
  if (found === undefined) fail(path, `expected one of ${allowed.join(', ')}`)
  return found
}
