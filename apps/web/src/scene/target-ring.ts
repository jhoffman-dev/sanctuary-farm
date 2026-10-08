/**
 * How the tap target ring looks, and how it fades when a tap cannot be
 * reached (SF-89). Pure numbers; `TargetMarker` only draws them.
 */
import type { GroundPoint } from './keeper-walk'

/**
 * Two bands: a deep-brown outline that holds ≥ 3:1 against every walkable
 * ground (grass, path, dirt) for a non-text UI element, and a cream core that
 * holds against the outline. The pair reads on light path and mid grass alike
 * by lightness alone, so it stays colour-blind safe; and it is never red.
 */
export const RING_OUTLINE = '#4a3220'
export const RING_CORE = '#fff3c4'

/** Radii in tiles (a tile is 1 across). The ring never reaches the tile's edge, so the tile still reads as ground. */
export const RING_OUTLINE_RADII = [0.26, 0.45] as const
export const RING_CORE_RADII = [0.3, 0.41] as const

/** Long enough to notice, short enough not to dwell on: "not there", never "wrong". */
export const UNREACHABLE_CUE_SECONDS = 0.4
/** A small side-to-side shake, in tiles at its widest: a head-shake, not a jolt. */
const SHAKE_TILES = 0.08
const SHAKES = 3
/**
 * Under an on-demand frameloop the first frame's delta is the time since the
 * last frame, which can be seconds. Capping it keeps the cue on screen for
 * its whole length instead of ending on the frame it starts.
 */
const LONGEST_FRAME_SECONDS = 1 / 30

export type CueLook = {
  readonly opacity: number
  /** Along the screen's left-right, in tiles. */
  readonly shake: number
}

/** The cue `elapsed` seconds in, or null once it is over. Reduced motion fades without shaking (game rule 8). */
export function unreachableCueLook(elapsed: number, reducedMotion: boolean): CueLook | null {
  if (elapsed >= UNREACHABLE_CUE_SECONDS) return null
  const progress = Math.max(elapsed, 0) / UNREACHABLE_CUE_SECONDS
  const fading = 1 - progress
  const shake = reducedMotion ? 0 : Math.sin(progress * SHAKES * 2 * Math.PI) * SHAKE_TILES * fading
  return { opacity: fading, shake }
}

/** One frame's worth of cue time, however long the frame really was. */
export function cueFrameSeconds(delta: number): number {
  return Math.min(Math.max(delta, 0), LONGEST_FRAME_SECONDS)
}

/** Left-to-right across the screen, on the ground, for a camera looking along `forward` (unit length). */
export function screenRight(forward: GroundPoint): GroundPoint {
  return { x: -forward.z, z: forward.x }
}
