import type { Chunk, TileWorld } from '@sf/world'
import { CHUNK_SIZE } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { HOME_VIEW } from './camera-views'
import { cameraForward, heldDirection, keyboardStep, routeForKeys } from './keyboard-step'

const NORTH = { x: 0, z: -1 }
const UP = { x: 0, z: -1 }
const RIGHT = { x: 1, z: 0 }

describe('heldDirection', () => {
  it('adds up the held keys, ignoring keys that do not move', () => {
    expect(heldDirection(['ArrowUp', 'KeyD', 'Space'])).toEqual({ x: 1, z: -1 })
  })

  it('is null when nothing is held or the keys cancel out', () => {
    expect(heldDirection([])).toBeNull()
    expect(heldDirection(['KeyA', 'KeyD'])).toBeNull()
  })
})

describe('keyboardStep', () => {
  it('walks up the screen as north when the camera looks north', () => {
    expect(keyboardStep(UP, NORTH)).toEqual({ x: 0, z: -1 })
    expect(keyboardStep(RIGHT, NORTH)).toEqual({ x: 1, z: 0 })
    expect(keyboardStep({ x: -1, z: 1 }, NORTH)).toEqual({ x: -1, z: 1 })
  })

  it('turns the keys into the §2 camera’s frame: up is north-west, up-and-right is north, right is north-east', () => {
    const forward = cameraForward(HOME_VIEW)
    expect(keyboardStep(UP, forward)).toEqual({ x: -1, z: -1 })
    expect(keyboardStep({ x: 1, z: -1 }, forward)).toEqual({ x: 0, z: -1 })
    expect(keyboardStep(RIGHT, forward)).toEqual({ x: 1, z: -1 })
    expect(keyboardStep({ x: 0, z: 1 }, forward)).toEqual({ x: 1, z: 1 })
  })
})

/** One chunk of grass with a wall of water along x = 2. */
function meadowWithStream(): TileWorld {
  const tiles = Array.from({ length: CHUNK_SIZE * CHUNK_SIZE }, (_, index) =>
    index % CHUNK_SIZE === 2 ? { ground: { kind: 'water' as const } } : { ground: { kind: 'grass' as const } },
  )
  const chunk: Chunk = { coord: { cx: 0, cz: 0 }, tiles }
  return { seed: 1, hotspots: [], chunks: [chunk] }
}

describe('routeForKeys', () => {
  const world = meadowWithStream()

  it('steps one tile the way the keys point', () => {
    expect(routeForKeys({ world, from: { x: 1, z: 5 }, screen: UP, forward: NORTH })).toEqual([
      { x: 1, z: 5 },
      { x: 1, z: 4 },
    ])
  })

  it('does not step into water', () => {
    expect(routeForKeys({ world, from: { x: 1, z: 5 }, screen: RIGHT, forward: NORTH })).toBeNull()
  })

  it('does not step off the land', () => {
    expect(routeForKeys({ world, from: { x: 0, z: 0 }, screen: UP, forward: NORTH })).toBeNull()
  })
})
