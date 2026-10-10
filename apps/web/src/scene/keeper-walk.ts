/**
 * The keeper following a route (SF-77): constant speed, turning to face its
 * own velocity, rounding corners instead of stopping on every tile centre.
 * Pure maths on plain numbers — which tiles to walk through is `@sf/world`'s
 * call (`planWalk`, `findRoute`); this only moves along them.
 */
import { type TileCoord, tileCentre } from '@sf/world'

/** A point or vector on the ground plane (three.js XZ, Y is up). */
export type GroundPoint = { readonly x: number; readonly z: number }

export type KeeperWalk = {
  readonly position: GroundPoint
  /** Radians about +Y; 0 faces north (−Z), the art-direction §8 facing. */
  readonly yaw: number
  /** Tile centres still to reach, in order; empty when standing. */
  readonly waypoints: readonly GroundPoint[]
}

/** How close to a corner waypoint counts as "there", so the keeper curves through it. */
export const CORNER_RADIUS = 0.35
/** Fast enough to read as turning to face the way it walks, slow enough not to snap. */
export const TURN_RADIANS_PER_SECOND = 10

export function standingAt(position: GroundPoint, yaw: number): KeeperWalk {
  return { position, yaw, waypoints: [] }
}

function centreOf(tile: TileCoord): GroundPoint {
  const [x, z] = tileCentre(tile)
  return { x, z }
}

/**
 * Sets the keeper off along a route of tiles (as `findRoute` returns them,
 * starting with the tile it stands on). The first tile is skipped unless it is
 * the whole route, so a keeper standing off-centre does not double back first.
 */
export function followRoute(walk: KeeperWalk, route: readonly TileCoord[]): KeeperWalk {
  const tiles = route.length > 1 ? route.slice(1) : route
  return { ...walk, waypoints: tiles.map(centreOf) }
}

/** The signed angle from `from` to `to`, always in (−π, π]. */
export function shortestTurn(from: number, to: number): number {
  const raw = (to - from) % (Math.PI * 2)
  if (raw > Math.PI) return raw - Math.PI * 2
  if (raw <= -Math.PI) return raw + Math.PI * 2
  return raw
}

/** The yaw that points the keeper's front (−Z at yaw 0) along `direction`. */
export function yawFacing(direction: GroundPoint): number {
  return Math.atan2(-direction.x, -direction.z)
}

function turnToward(current: number, desired: number, maxTurn: number): number {
  const turn = shortestTurn(current, desired)
  return current + Math.sign(turn) * Math.min(Math.abs(turn), maxTurn)
}

type Travel = { readonly position: GroundPoint; readonly waypoints: readonly GroundPoint[] }

/** Spends `budget` units of distance along the waypoints; never overshoots the last one. */
function travel(position: GroundPoint, waypoints: readonly GroundPoint[], budget: number): Travel {
  let at = position
  let remaining = [...waypoints]
  let left = budget
  while (left > 0 && remaining.length > 0) {
    const [target] = remaining as [GroundPoint]
    const distance = Math.hypot(target.x - at.x, target.z - at.z)
    if (remaining.length > 1 && distance <= CORNER_RADIUS) {
      remaining = remaining.slice(1)
      continue
    }
    if (distance <= left) {
      at = target
      left -= distance
      remaining = remaining.slice(1)
      continue
    }
    at = { x: at.x + ((target.x - at.x) / distance) * left, z: at.z + ((target.z - at.z) / distance) * left }
    left = 0
  }
  return { position: at, waypoints: remaining }
}

export type WalkStep = {
  readonly walk: KeeperWalk
  /** Ground speed this frame, which picks the clip. */
  readonly speed: number
  /** True on the one frame the keeper reaches the end of its route. */
  readonly arrived: boolean
}

/** One frame of walking at `speed` units per second. */
export function stepWalk(walk: KeeperWalk, { delta, speed }: { delta: number; speed: number }): WalkStep {
  if (walk.waypoints.length === 0 || delta <= 0) return { walk, speed: 0, arrived: false }
  const moved = travel(walk.position, walk.waypoints, speed * delta)
  const velocity = { x: moved.position.x - walk.position.x, z: moved.position.z - walk.position.z }
  const distance = Math.hypot(velocity.x, velocity.z)
  const yaw = distance > 0 ? turnToward(walk.yaw, yawFacing(velocity), TURN_RADIANS_PER_SECOND * delta) : walk.yaw
  return {
    walk: { position: moved.position, yaw, waypoints: moved.waypoints },
    speed: distance / delta,
    arrived: moved.waypoints.length === 0,
  }
}

export type LocomotionClip = 'idle' | 'walk'

/** Below this the walk cycle would foot-slide, so it reads as standing (ADR-0004). */
export const WALK_SPEED_THRESHOLD = 0.05

/**
 * The clip a ground speed asks for. Under reduced motion the keeper glides on
 * its idle pose: the walk cycle's bob is exactly the motion being opted out of.
 */
export function clipFor(speed: number, reducedMotion: boolean): LocomotionClip {
  return speed > WALK_SPEED_THRESHOLD && !reducedMotion ? 'walk' : 'idle'
}
