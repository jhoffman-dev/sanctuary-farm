import { describe, expect, it } from 'vitest'
import {
  CORNER_RADIUS,
  clipFor,
  followRoute,
  shortestTurn,
  standingAt,
  stepWalk,
  TURN_RADIANS_PER_SECOND,
  WALK_SPEED_THRESHOLD,
  yawFacing,
} from './keeper-walk'

const SPEED = 3.75
const FRAME = 1 / 60

/** Runs whole frames until the walk ends, returning every step and the frame count. */
function walkToEnd(route: Parameters<typeof followRoute>[1], from = standingAt({ x: 0.5, z: 0.5 }, 0)) {
  let walk = followRoute(from, route)
  const steps = []
  for (let frame = 0; frame < 10_000; frame++) {
    const step = stepWalk(walk, { delta: FRAME, speed: SPEED })
    steps.push(step)
    walk = step.walk
    if (step.arrived) return { walk, steps }
  }
  throw new Error('never arrived')
}

describe('followRoute', () => {
  it('heads for the tile centres after the one the keeper stands on', () => {
    const walk = followRoute(standingAt({ x: 0.5, z: 0.5 }, 0), [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 1 },
    ])
    expect(walk.waypoints).toEqual([
      { x: 1.5, z: 0.5 },
      { x: 2.5, z: 1.5 },
    ])
  })

  it('walks to the centre of a one-tile route, so a keeper standing off-centre settles on it', () => {
    expect(followRoute(standingAt({ x: 0.2, z: 0.9 }, 0), [{ x: 0, z: 0 }]).waypoints).toEqual([{ x: 0.5, z: 0.5 }])
  })
})

describe('stepWalk', () => {
  it('stands still with no route, and reports no arrival', () => {
    const walk = standingAt({ x: 1, z: 1 }, 0)
    expect(stepWalk(walk, { delta: FRAME, speed: SPEED })).toEqual({ walk, speed: 0, arrived: false })
  })

  it('moves at constant speed and ends exactly on the last tile centre, without overshooting', () => {
    const { walk, steps } = walkToEnd([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ])
    expect(walk.position).toEqual({ x: 3.5, z: 0.5 })
    expect(walk.waypoints).toEqual([])
    for (const step of steps.slice(0, -1)) expect(step.speed).toBeCloseTo(SPEED, 6)
    expect(steps.filter((step) => step.arrived)).toHaveLength(1)
    // Three units at 3.75 u/s is 0.8 s: 48 frames.
    expect(steps).toHaveLength(48)
  })

  it('reaches the end in one long frame without stepping past it', () => {
    const walk = followRoute(standingAt({ x: 0.5, z: 0.5 }, 0), [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ])
    const step = stepWalk(walk, { delta: 2, speed: SPEED })
    expect(step.walk.position).toEqual({ x: 1.5, z: 0.5 })
    expect(step.arrived).toBe(true)
    expect(step.speed).toBeCloseTo(0.5)
  })

  it('rounds a corner instead of touching its tile centre', () => {
    const { steps } = walkToEnd([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 1, z: 1 },
    ])
    const corner = { x: 1.5, z: 0.5 }
    const closest = Math.min(...steps.map(({ walk }) => Math.hypot(walk.position.x - corner.x, walk.position.z - corner.z)))
    expect(closest).toBeGreaterThan(0)
    expect(closest).toBeLessThanOrEqual(CORNER_RADIUS)
  })

  it('turns towards its velocity, no faster than the turn rate', () => {
    // Facing north, walking east: a quarter turn clockwise, which is −π/2 in three.js's sense.
    const walk = followRoute(standingAt({ x: 0.5, z: 0.5 }, 0), [
      { x: 0, z: 0 },
      { x: 5, z: 0 },
    ])
    const first = stepWalk(walk, { delta: FRAME, speed: SPEED })
    expect(first.walk.yaw).toBeCloseTo(-TURN_RADIANS_PER_SECOND * FRAME)
    const { walk: settled } = walkToEnd([
      { x: 0, z: 0 },
      { x: 5, z: 0 },
    ])
    expect(settled.yaw).toBeCloseTo(-Math.PI / 2)
  })

  it('does nothing on a zero-length frame', () => {
    const walk = followRoute(standingAt({ x: 0.5, z: 0.5 }, 0), [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ])
    expect(stepWalk(walk, { delta: 0, speed: SPEED }).walk).toBe(walk)
  })
})

describe('facing', () => {
  it.each([
    ['north', { x: 0, z: -1 }, 0],
    ['east', { x: 1, z: 0 }, -Math.PI / 2],
    ['south', { x: 0, z: 1 }, Math.PI],
    ['west', { x: -1, z: 0 }, Math.PI / 2],
  ])('faces %s', (_, direction, yaw) => {
    // Compared as a turn: south is π or −π, the same facing.
    expect(shortestTurn(yawFacing(direction), yaw)).toBeCloseTo(0)
  })

  it('turns the short way round', () => {
    expect(shortestTurn(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2)
    expect(shortestTurn(-Math.PI * 0.9, Math.PI * 0.9)).toBeCloseTo(-Math.PI * 0.2)
    expect(shortestTurn(0, 3 * Math.PI)).toBeCloseTo(Math.PI)
  })
})

describe('clipFor', () => {
  it('walks above the foot-slide threshold and idles at or below it', () => {
    expect(clipFor(3.75, false)).toBe('walk')
    expect(clipFor(WALK_SPEED_THRESHOLD, false)).toBe('idle')
    expect(clipFor(0, false)).toBe('idle')
  })

  it('keeps the idle pose while gliding under reduced motion', () => {
    expect(clipFor(3.75, true)).toBe('idle')
  })
})
