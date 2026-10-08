import { describe, expect, it } from 'vitest'
import { autotile, maskOf } from './autotile'
import type { AutotileRole, QuarterTurns } from './tile-kinds'
import type { Direction } from './tile-grid'

const N = 1
const E = 2
const S = 4
const W = 8

/** All 16 neighbour masks. Rotation is clockwise quarter turns from the role's authored shape. */
const TABLE: readonly (readonly [string, number, AutotileRole, QuarterTurns])[] = [
  ['none', 0, 'end', 0],
  ['N', N, 'end', 0],
  ['E', E, 'end', 1],
  ['S', S, 'end', 2],
  ['W', W, 'end', 3],
  ['N+S', N | S, 'straight', 0],
  ['E+W', E | W, 'straight', 1],
  ['N+E', N | E, 'corner', 0],
  ['E+S', E | S, 'corner', 1],
  ['S+W', S | W, 'corner', 2],
  ['W+N', W | N, 'corner', 3],
  ['N+E+S', N | E | S, 'tee', 0],
  ['E+S+W', E | S | W, 'tee', 1],
  ['S+W+N', S | W | N, 'tee', 2],
  ['W+N+E', W | N | E, 'tee', 3],
  ['all', N | E | S | W, 'cross', 0],
]

describe('autotile', () => {
  it('covers every one of the 16 masks exactly once', () => {
    expect(new Set(TABLE.map(([, mask]) => mask)).size).toBe(16)
  })

  it.each(TABLE)('mask %s (%i) → %s at %i quarter turns', (_name, mask, role, rotation) => {
    expect(autotile(mask)).toEqual({ role, rotation })
  })

  it('builds a mask from the connected sides: north 1, east 2, south 4, west 8', () => {
    const connected = new Set<Direction>(['north', 'west'])
    expect(maskOf((side) => connected.has(side))).toBe(N | W)
    expect(maskOf(() => true)).toBe(15)
    expect(maskOf(() => false)).toBe(0)
  })
})
