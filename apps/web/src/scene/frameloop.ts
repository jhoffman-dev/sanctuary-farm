/** How react-three-fiber drives its render loop. 'demand' draws only when something asks. */
export type SceneFrameloop = 'always' | 'demand'

/**
 * How long the loop keeps running after the keeper and camera last moved:
 * long enough for the keeper's quarter-second walk → idle crossfade
 * (ADR-0004) to finish, so a still farm never freezes mid-blend.
 */
export const SETTLE_SECONDS = 0.5

/** Below this, per frame, the keeper and camera count as still; the camera's ease never quite reaches zero. */
export const STILL_METRES = 0.001

/**
 * The longest step any frame takes. A loop on demand can sit idle for minutes,
 * and the first frame after a tap would otherwise carry all of it — the keeper
 * would arrive before it had visibly set off. A slower device walks in slow
 * motion rather than in jumps.
 */
export const MAX_FRAME_SECONDS = 0.1

export function capFrameSeconds(seconds: number): number {
  return Math.min(seconds, MAX_FRAME_SECONDS)
}

export function isSettled(secondsStill: number): boolean {
  return secondsStill >= SETTLE_SECONDS
}

export type FrameloopInputs = {
  /** The player asked for reduced motion (game rule 8): a still frame, not a slower sway. */
  readonly reducedMotion: boolean
  /** The tier probe is timing frames, so it needs them. */
  readonly probing: boolean
  /** The tier plays idle clips at rest. */
  readonly idleLoops: boolean
  /** The tier sways the camera at rest. */
  readonly cameraSway: boolean
  /** The keeper and the camera have been still for `SETTLE_SECONDS`. */
  readonly settled: boolean
}

/**
 * Render every frame only while something moves (performance budget rule 5);
 * a farm at rest costs 0 ms. Idle clips and sway count as movement, so only a
 * tier without them (the low tier) ever rests. Under reduced motion the loop
 * stays on demand even mid-walk: the keeper asks for each frame of its walk.
 */
export function sceneFrameloop({ reducedMotion, probing, idleLoops, cameraSway, settled }: FrameloopInputs): SceneFrameloop {
  if (reducedMotion) return 'demand'
  if (probing || idleLoops || cameraSway || !settled) return 'always'
  return 'demand'
}
