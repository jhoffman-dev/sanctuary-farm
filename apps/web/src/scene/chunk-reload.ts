/**
 * A deploy replaces every hashed chunk. A tab left open across one asks for a
 * file that is gone, and Hosting answers the SPA rewrite — `index.html`, served
 * as HTML — so the dynamic import dies on a MIME error. One reload picks up the
 * new `index.html` and its new chunk names; a second means the chunk is
 * genuinely unreachable, and reloading again would spin the tab forever.
 */
export const MAX_CHUNK_RELOADS = 1

/**
 * Whether a failed scene chunk is worth one more page load.
 *
 * `null` attempts means the counter could not be read at all, so a loop cannot
 * be ruled out — and a farm that never stops reloading is worse than a farm
 * with no scenery. A non-integer or negative count is a tampered-with or
 * corrupted counter and gets the same answer.
 */
export function shouldReloadAfterChunkError(previousAttempts: number | null): previousAttempts is number {
  if (previousAttempts === null || !Number.isInteger(previousAttempts)) return false
  return previousAttempts >= 0 && previousAttempts < MAX_CHUNK_RELOADS
}
