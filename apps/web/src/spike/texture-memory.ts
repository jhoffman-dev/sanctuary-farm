/**
 * `renderer.info.memory.textures` is a count, not bytes, but the performance
 * budget is written in MB — so the spike estimates the bytes itself.
 */

export type TextureSize = { width: number; height: number }

const BYTES_PER_TEXEL_RGBA8 = 4
/** A full mip chain adds a third again on top of the base level. */
const MIPMAP_FACTOR = 4 / 3

/**
 * Uploaded bytes for a set of RGBA8, mipmapped textures. An upper bound: it
 * assumes no GPU-side compression, which is what we ship today (the KTX2/Basis
 * line in performance-budget.md is still a Phase 2 follow-up).
 */
export function estimateTextureBytes(sizes: readonly TextureSize[], { mipmapped = true } = {}): number {
  const base = sizes.reduce((total, { width, height }) => total + width * height * BYTES_PER_TEXEL_RGBA8, 0)
  return Math.round(mipmapped ? base * MIPMAP_FACTOR : base)
}
