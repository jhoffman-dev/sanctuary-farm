/**
 * How the §2 camera follows the keeper (SF-77). It never turns or tilts —
 * only slides, so the storybook angle holds. A dead zone round the home view's
 * centre keeps it still while the keeper is comfortably in frame: on a
 * landscape screen the whole farm fits, so the camera stays put; on a phone
 * the zone is small and the camera slides to keep the keeper in view.
 */
import type { GroundPoint } from './keeper-walk'

const ORIGIN: GroundPoint = { x: 0, z: 0 }
const MIN_FOLLOW_RADIUS = 2.5
/** Wider than the farm's half-width from the home centre, so 16:10 never pans. */
const MAX_FOLLOW_RADIUS = 14
/** How quickly the camera catches up, per second: a glide, not a lock. */
export const FOLLOW_RATE = 2.5

/** The dead zone's radius in world units for a viewport's width ÷ height. */
export function followRadius(aspect: number): number {
  return Math.min(Math.max(10 * aspect - 2, MIN_FOLLOW_RADIUS), MAX_FOLLOW_RADIUS)
}

/** How far the camera should be slid so the keeper sits on the dead zone's edge, or not slid at all inside it. */
export function followOffset({ keeper, centre, radius }: { keeper: GroundPoint; centre: GroundPoint; radius: number }): GroundPoint {
  const dx = keeper.x - centre.x
  const dz = keeper.z - centre.z
  const distance = Math.hypot(dx, dz)
  if (distance <= radius) return ORIGIN
  const beyond = (distance - radius) / distance
  return { x: dx * beyond, z: dz * beyond }
}

/**
 * One frame of the camera catching up with `target`. With reduced motion it
 * snaps instead of gliding (game rule 8).
 */
export function easeOffset({
  current,
  target,
  delta,
  reducedMotion,
}: {
  current: GroundPoint
  target: GroundPoint
  delta: number
  reducedMotion: boolean
}): GroundPoint {
  if (reducedMotion) return target
  const share = 1 - Math.exp(-FOLLOW_RATE * delta)
  return { x: current.x + (target.x - current.x) * share, z: current.z + (target.z - current.z) * share }
}
