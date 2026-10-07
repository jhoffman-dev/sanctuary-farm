import { describe, expect, it } from 'vitest'
import {
  advance,
  clipForSpeed,
  desiredVelocity,
  rotateAroundY,
  shortestTurn,
  turnToward,
  yawOf,
} from './steering'

const SPEED = 2
const ARRIVE = 0.1
const FRAME = 1 / 60

describe('desiredVelocity', () => {
  it('is still with no target and no keys', () => {
    expect(
      desiredVelocity({
        position: { x: 0, z: 0 },
        target: null,
        keyboard: null,
        speed: SPEED,
        arriveRadius: ARRIVE,
        delta: FRAME,
      }),
    ).toEqual({ x: 0, z: 0 })
  })

  it('heads at full speed towards a distant target', () => {
    const velocity = desiredVelocity({
      position: { x: 0, z: 0 },
      target: { x: 3, z: 4 },
      keyboard: null,
      speed: SPEED,
      arriveRadius: ARRIVE,
      delta: FRAME,
    })
    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(SPEED, 10)
    expect(velocity.x / velocity.z).toBeCloseTo(3 / 4, 10)
  })

  it('stops once inside the arrive radius', () => {
    expect(
      desiredVelocity({
        position: { x: 0, z: 0 },
        target: { x: 0.05, z: 0 },
        keyboard: null,
        speed: SPEED,
        arriveRadius: ARRIVE,
        delta: FRAME,
      }),
    ).toEqual({ x: 0, z: 0 })
  })

  it('never overshoots the target in one long frame', () => {
    const position = { x: 0, z: 0 }
    const target = { x: 0.2, z: 0 }
    const delta = 0.5
    const velocity = desiredVelocity({ position, target, keyboard: null, speed: SPEED, arriveRadius: ARRIVE, delta })
    const next = advance({ position, velocity, delta })
    expect(next.x).toBeCloseTo(target.x, 10)
  })

  it('normalises a diagonal key press so diagonals are not faster', () => {
    const velocity = desiredVelocity({
      position: { x: 0, z: 0 },
      target: null,
      keyboard: { x: 1, z: 1 },
      speed: SPEED,
      arriveRadius: ARRIVE,
      delta: FRAME,
    })
    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(SPEED, 10)
  })

  it('lets a key press take over from a tapped target', () => {
    const velocity = desiredVelocity({
      position: { x: 0, z: 0 },
      target: { x: 10, z: 0 },
      keyboard: { x: 0, z: -1 },
      speed: SPEED,
      arriveRadius: ARRIVE,
      delta: FRAME,
    })
    expect(velocity).toEqual({ x: 0, z: -SPEED })
  })

  it('treats cancelling key presses as standing still', () => {
    expect(
      desiredVelocity({
        position: { x: 0, z: 0 },
        target: null,
        keyboard: { x: 0, z: 0 },
        speed: SPEED,
        arriveRadius: ARRIVE,
        delta: FRAME,
      }),
    ).toEqual({ x: 0, z: 0 })
  })
})

describe('advance', () => {
  it('integrates velocity over the frame', () => {
    expect(advance({ position: { x: 1, z: 2 }, velocity: { x: 4, z: -2 }, delta: 0.5 })).toEqual({ x: 3, z: 1 })
  })
})

describe('yawOf', () => {
  it('faces +Z at yaw 0, matching the art-direction asset rule', () => {
    expect(yawOf({ x: 0, z: 1 })).toBeCloseTo(0, 10)
  })

  it('faces +X at a quarter turn', () => {
    expect(yawOf({ x: 1, z: 0 })).toBeCloseTo(Math.PI / 2, 10)
  })
})

describe('shortestTurn', () => {
  it('takes the short way round the wrap point', () => {
    expect(shortestTurn(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6, 10)
    expect(shortestTurn(-3.0, 3.0)).toBeCloseTo(6 - 2 * Math.PI, 10)
  })

  it('is zero for the same angle', () => {
    expect(shortestTurn(1.23, 1.23)).toBe(0)
  })
})

describe('turnToward', () => {
  it('moves at most maxTurn radians', () => {
    expect(turnToward({ current: 0, desired: Math.PI, maxTurn: 0.1 })).toBeCloseTo(0.1, 10)
  })

  it('lands exactly on the desired angle when it is within reach', () => {
    expect(turnToward({ current: 0, desired: 0.05, maxTurn: 0.1 })).toBeCloseTo(0.05, 10)
  })

  it('turns the short way across the wrap point', () => {
    expect(turnToward({ current: 3.1, desired: -3.1, maxTurn: 0.05 })).toBeCloseTo(3.15, 10)
  })
})

describe('rotateAroundY', () => {
  it('is the identity at zero', () => {
    expect(rotateAroundY({ x: 1, z: 2 }, 0)).toEqual({ x: 1, z: 2 })
  })

  it('maps screen-up onto the camera direction for the art-direction rig', () => {
    // Camera [9,7,12] looking at [0,0.6,0]: its ground forward is (-0.6, -0.8).
    const yaw = yawOf({ x: 9, z: 12 })
    const world = rotateAroundY({ x: 0, z: -1 }, yaw)
    expect(world.x).toBeCloseTo(-0.6, 6)
    expect(world.z).toBeCloseTo(-0.8, 6)
  })
})

describe('clipForSpeed', () => {
  it('walks above the threshold and idles at or below it', () => {
    expect(clipForSpeed(1.9, 0.05)).toBe('Walk')
    expect(clipForSpeed(0.05, 0.05)).toBe('Idle')
    expect(clipForSpeed(0, 0.05)).toBe('Idle')
  })
})
