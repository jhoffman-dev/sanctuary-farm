/**
 * Ground-plane steering for the SF-63 spike: where the keeper wants to go this
 * frame, which way it should face, and which clip that speed asks for.
 *
 * Pure maths on plain numbers — no three.js, no React — so the Phase 2 controller
 * can keep this and throw the rendering away.
 */

/** A point or vector on the ground plane (three.js XZ, Y is up). */
export type GroundVector = { x: number; z: number }

export const ORIGIN: GroundVector = { x: 0, z: 0 }

function length({ x, z }: GroundVector): number {
  return Math.hypot(x, z)
}

function scaled({ x, z }: GroundVector, factor: number): GroundVector {
  return { x: x * factor, z: z * factor }
}

/**
 * The velocity the keeper should have this frame. Keyboard input wins over a
 * tapped target so a player can always take back control mid-walk.
 */
export function desiredVelocity({
  position,
  target,
  keyboard,
  speed,
  arriveRadius,
  delta,
}: {
  position: GroundVector
  target: GroundVector | null
  keyboard: GroundVector | null
  speed: number
  arriveRadius: number
  delta: number
}): GroundVector {
  if (keyboard) {
    const held = length(keyboard)
    return held > 0 ? scaled(keyboard, speed / held) : ORIGIN
  }
  if (!target) return ORIGIN

  const toTarget = { x: target.x - position.x, z: target.z - position.z }
  const remaining = length(toTarget)
  if (remaining <= arriveRadius) return ORIGIN
  // Never overshoot on the last stride: a long frame would otherwise step past
  // the target and jitter around it forever.
  const capped = delta > 0 ? Math.min(speed, remaining / delta) : speed
  return scaled(toTarget, capped / remaining)
}

/** Integrate one frame of movement. */
export function advance({
  position,
  velocity,
  delta,
}: {
  position: GroundVector
  velocity: GroundVector
  delta: number
}): GroundVector {
  return { x: position.x + velocity.x * delta, z: position.z + velocity.z * delta }
}

/**
 * The yaw that points a model's forward axis (+Z, per the art-direction asset
 * rules) along `direction`.
 */
export function yawOf(direction: GroundVector): number {
  return Math.atan2(direction.x, direction.z)
}

/** Rotate a ground vector by `angle` radians about the Y axis (three.js sense). */
export function rotateAroundY(vector: GroundVector, angle: number): GroundVector {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return { x: vector.x * cos + vector.z * sin, z: -vector.x * sin + vector.z * cos }
}

/** The signed angle from `from` to `to`, always in (-π, π]. */
export function shortestTurn(from: number, to: number): number {
  const raw = (to - from) % (Math.PI * 2)
  if (raw > Math.PI) return raw - Math.PI * 2
  if (raw <= -Math.PI) return raw + Math.PI * 2
  return raw
}

/** Rotate `current` towards `desired` by at most `maxTurn` radians. */
export function turnToward({
  current,
  desired,
  maxTurn,
}: {
  current: number
  desired: number
  maxTurn: number
}): number {
  const turn = shortestTurn(current, desired)
  return current + Math.sign(turn) * Math.min(Math.abs(turn), maxTurn)
}

export type LocomotionClip = 'Idle' | 'Walk'

/**
 * The clip a given ground speed asks for. A threshold rather than a blend tree:
 * the keeper only ever walks or stands, so one crossfade covers it.
 */
export function clipForSpeed(speed: number, walkThreshold: number): LocomotionClip {
  return speed > walkThreshold ? 'Walk' : 'Idle'
}
