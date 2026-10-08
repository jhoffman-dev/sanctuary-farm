import { describe, expect, it } from 'vitest'
import { HOME_VIEW } from './camera-views'
import { FACING_TURN_RADIANS_PER_SECOND, THREE_QUARTER_RADIANS, turnOnTheSpot, yawTowardCamera } from './keeper-facing'
import { shortestTurn, yawFacing } from './keeper-walk'

const FRAME = 1 / 60
const SOUTH = Math.PI
const camera = { x: HOME_VIEW.position[0], z: HOME_VIEW.position[2] }

/** The angle between the keeper's front and the line from her to the camera. */
function offCamera(keeper: { x: number; z: number }, yaw: number): number {
  return Math.abs(shortestTurn(yaw, yawFacing({ x: camera.x - keeper.x, z: camera.z - keeper.z })))
}

describe('yawTowardCamera', () => {
  it('turns her a three-quarter view toward the camera, wherever she stands', () => {
    for (const keeper of [{ x: 0, z: 0 }, { x: -12, z: -10 }, { x: 8, z: 4 }]) {
      const yaw = yawTowardCamera({ keeper, camera, current: 0 })
      expect(offCamera(keeper, yaw)).toBeCloseTo(THREE_QUARTER_RADIANS, 9)
    }
  })

  it('picks the side that is the shorter turn from where she faces now', () => {
    const keeper = { x: 0, z: 0 }
    const straight = yawFacing({ x: camera.x, z: camera.z })
    const fromLeft = yawTowardCamera({ keeper, camera, current: straight + 1 })
    const fromRight = yawTowardCamera({ keeper, camera, current: straight - 1 })

    expect(shortestTurn(straight, fromLeft)).toBeCloseTo(THREE_QUARTER_RADIANS, 9)
    expect(shortestTurn(straight, fromRight)).toBeCloseTo(-THREE_QUARTER_RADIANS, 9)
  })

  it('stays within (−π, π] when the camera is behind the yaw seam', () => {
    const yaw = yawTowardCamera({ keeper: { x: 0, z: -10 }, camera: { x: 0, z: 10 }, current: SOUTH })

    expect(yaw).toBeGreaterThan(-Math.PI)
    expect(yaw).toBeLessThanOrEqual(Math.PI)
    expect(Math.abs(shortestTurn(SOUTH, yaw))).toBeCloseTo(THREE_QUARTER_RADIANS, 9)
  })
})

describe('turnOnTheSpot', () => {
  it('turns gradually, the short way round, and says when it is done', () => {
    let turn = { yaw: 0, done: false }
    let frames = 0
    while (!turn.done && frames < 600) {
      const next = turnOnTheSpot({ yaw: turn.yaw, desired: -2, delta: FRAME, reducedMotion: false })
      expect(Math.abs(shortestTurn(turn.yaw, next.yaw))).toBeLessThanOrEqual(FACING_TURN_RADIANS_PER_SECOND * FRAME + 1e-9)
      expect(next.yaw).toBeLessThanOrEqual(turn.yaw)
      turn = next
      frames += 1
    }
    expect(turn).toEqual({ yaw: -2, done: true })
    // Two radians at the facing rate is half a second; float rounding may add a last tiny frame.
    expect(frames).toBeGreaterThanOrEqual(30)
    expect(frames).toBeLessThanOrEqual(31)
  })

  it('snaps straight there under reduced motion', () => {
    expect(turnOnTheSpot({ yaw: 0, desired: 3, delta: FRAME, reducedMotion: true })).toEqual({ yaw: 3, done: true })
  })

  it('does not move on a zero or negative frame', () => {
    expect(turnOnTheSpot({ yaw: 1, desired: 2, delta: 0, reducedMotion: false })).toEqual({ yaw: 1, done: false })
    expect(turnOnTheSpot({ yaw: 1, desired: 2, delta: -1, reducedMotion: false })).toEqual({ yaw: 1, done: false })
  })
})
