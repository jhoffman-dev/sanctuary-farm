/**
 * Art-direction §3 asks that every animal be identifiable as a black silhouette
 * at 64 px. To answer that with a number rather than a squint, the spike
 * measures how tall each model actually is on screen.
 */

/** Convert a height in normalised device coordinates to pixels. */
export function ndcHeightToPixels(ndcHeight: number, viewportHeightPx: number): number {
  // NDC spans -1..1 across the viewport, so one NDC unit is half the height.
  return (ndcHeight * viewportHeightPx) / 2
}
