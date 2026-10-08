import type { Chunk, TileWorld } from '@sf/world'
import { CHUNK_SIZE, NEAREST_WALKABLE_RADIUS } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { respondToTap } from './tap-response'

/**
 * One chunk of grass with a moat of water round the 3 × 3 block at x, z 10..12:
 * the block is land the keeper can see but never reach.
 */
function meadowWithMoatedIsland(): TileWorld {
  const tiles = Array.from({ length: CHUNK_SIZE * CHUNK_SIZE }, (_, index) => {
    const [x, z] = [index % CHUNK_SIZE, Math.floor(index / CHUNK_SIZE)]
    const moat = Math.max(Math.abs(x - 11), Math.abs(z - 11)) === 2
    return { ground: { kind: moat ? ('water' as const) : ('grass' as const) } }
  })
  const chunk: Chunk = { coord: { cx: 0, cz: 0 }, tiles }
  return { seed: 1, hotspots: [], chunks: [chunk] }
}

const world = meadowWithMoatedIsland()
const from = { x: 1, z: 1 }

describe('respondToTap', () => {
  it('walks to a tile the keeper can reach, the route starting where it stands', () => {
    const response = respondToTap({ world, from, tapped: { x: 4, z: 1 } })

    expect(response.kind).toBe('walk')
    if (response.kind !== 'walk') return
    expect(response.route[0]).toEqual(from)
    expect(response.goal).toEqual({ x: 4, z: 1 })
  })

  it('walks to the nearest reachable tile for a tap on water', () => {
    const response = respondToTap({ world, from, tapped: { x: 11, z: 9 } })

    expect(response).toMatchObject({ kind: 'walk', goal: { x: 11, z: 8 } })
  })

  it('cues the tapped tile, and plans no walk, for land cut off by water', () => {
    expect(respondToTap({ world, from, tapped: { x: 11, z: 11 } })).toEqual({ kind: 'unreachable', tapped: { x: 11, z: 11 } })
  })

  it('cues a tap so far off the land that nothing walkable is near it', () => {
    const tapped = { x: CHUNK_SIZE + NEAREST_WALKABLE_RADIUS + 1, z: 4 }

    expect(respondToTap({ world, from, tapped })).toEqual({ kind: 'unreachable', tapped })
  })

  it('treats a tap on the keeper’s own tile as a walk of one tile, not a cue', () => {
    expect(respondToTap({ world, from, tapped: from })).toEqual({ kind: 'walk', route: [from], goal: from })
  })
})
