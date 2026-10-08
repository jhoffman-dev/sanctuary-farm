/**
 * The keeper turning to face the player once she arrives somewhere (SF-89).
 * She walks up to a gate with her back to the camera; when the panel opens she
 * should be looking out at the child, not at the fence. Pure maths on plain
 * numbers, like `keeper-walk`.
 */
import { type GroundPoint, shortestTurn, turnToward, yawFacing } from './keeper-walk'

/**
 * A three-quarter view rather than dead-on: her face and one side both read,
 * the way a storybook figure stands.
 */
export const THREE_QUARTER_RADIANS = Math.PI / 6
/** About half a turn in under a second: an unhurried look round, not a spin. */
export const FACING_TURN_RADIANS_PER_SECOND = 4

/** `angle` wrapped into (−π, π]. */
function wrapped(angle: number): number {
  return shortestTurn(0, angle)
}

/**
 * The yaw that shows the camera a three-quarter view of the keeper: toward the
 * camera's spot on the ground, turned a little to whichever side is the
 * shorter turn from `current`.
 */
export function yawTowardCamera({
  keeper,
  camera,
  current,
}: {
  keeper: GroundPoint
  camera: GroundPoint
  current: number
}): number {
  const straight = yawFacing({ x: camera.x - keeper.x, z: camera.z - keeper.z })
  const [left, right] = [wrapped(straight + THREE_QUARTER_RADIANS), wrapped(straight - THREE_QUARTER_RADIANS)]
  return Math.abs(shortestTurn(current, left)) <= Math.abs(shortestTurn(current, right)) ? left : right
}

export type FacingTurn = { readonly yaw: number; readonly done: boolean }

/** One frame of turning on the spot toward `desired`. Reduced motion turns at once (game rule 8). */
export function turnOnTheSpot({
  yaw,
  desired,
  delta,
  reducedMotion,
}: {
  yaw: number
  desired: number
  delta: number
  reducedMotion: boolean
}): FacingTurn {
  if (reducedMotion) return { yaw: desired, done: true }
  const next = turnToward(yaw, desired, FACING_TURN_RADIANS_PER_SECOND * Math.max(delta, 0))
  return { yaw: next, done: shortestTurn(next, desired) === 0 }
}
