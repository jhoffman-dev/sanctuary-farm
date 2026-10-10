/**
 * Arrow keys / WASD as tile steps (SF-77, ADR-0004's keyboard fallback). Keys
 * are screen-relative — "up" walks away from the camera — so the held
 * direction is turned into the camera's ground frame and snapped to one of the
 * eight neighbouring tiles. Whether that tile can be walked to is
 * `@sf/world`'s call; this only says which one is meant.
 */
import { findRoute, type TileCoord, type TileWorld } from '@sf/world'
import type { GroundPoint } from './keeper-walk'
import type { CameraView } from './camera-views'

/** Screen-space key directions: x right, z down the screen. */
export const KEY_DIRECTIONS: Readonly<Record<string, GroundPoint>> = {
  ArrowUp: { x: 0, z: -1 },
  KeyW: { x: 0, z: -1 },
  ArrowDown: { x: 0, z: 1 },
  KeyS: { x: 0, z: 1 },
  ArrowLeft: { x: -1, z: 0 },
  KeyA: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  KeyD: { x: 1, z: 0 },
}

/** The sum of the held keys' directions, or null when they cancel out or none is held. */
export function heldDirection(held: Iterable<string>): GroundPoint | null {
  let x = 0
  let z = 0
  for (const code of held) {
    const direction = KEY_DIRECTIONS[code]
    if (!direction) continue
    x += direction.x
    z += direction.z
  }
  return x === 0 && z === 0 ? null : { x, z }
}

/** Where the camera looks, flattened onto the ground and normalised. */
export function cameraForward(view: CameraView): GroundPoint {
  const x = view.lookAt[0] - view.position[0]
  const z = view.lookAt[2] - view.position[2]
  const length = Math.hypot(x, z)
  return { x: x / length, z: z / length }
}

/** The neighbouring-tile step a screen direction asks for, seen from a camera looking along `forward`. */
export function keyboardStep(screen: GroundPoint, forward: GroundPoint): TileCoord {
  // Screen right is forward turned a quarter clockwise seen from above.
  const right = { x: -forward.z, z: forward.x }
  const x = -screen.z * forward.x + screen.x * right.x
  const z = -screen.z * forward.z + screen.x * right.z
  const eighth = Math.round(Math.atan2(z, x) / (Math.PI / 4))
  const angle = eighth * (Math.PI / 4)
  // `|| 0` folds −0 into 0, so a step compares equal to the tile arithmetic's.
  return { x: Math.round(Math.cos(angle)) || 0, z: Math.round(Math.sin(angle)) || 0 }
}

/**
 * The one-tile route the held keys ask for from `from`, or null when that
 * neighbour cannot be stepped onto directly (water, a fence, a corner the
 * keeper would clip) — the keeper then simply does not move.
 */
export function routeForKeys({
  world,
  from,
  screen,
  forward,
}: {
  world: TileWorld
  from: TileCoord
  screen: GroundPoint
  forward: GroundPoint
}): TileCoord[] | null {
  const step = keyboardStep(screen, forward)
  const route = findRoute(world, from, { x: from.x + step.x, z: from.z + step.z })
  return route?.length === 2 ? route : null
}
