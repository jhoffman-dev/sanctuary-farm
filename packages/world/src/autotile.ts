/**
 * Autotiling: a fence or path tile picks its piece from which of its four
 * neighbours are the same kind. Each role is authored once, at rotation 0, and
 * every other mask is that shape turned clockwise — so the 16 masks need five
 * base shapes, not a 16-row table that could drift from the art.
 */
import type { AutotileRole, QuarterTurns } from './tile-kinds'
import type { Direction } from './tile-grid'
import { DIRECTIONS } from './tile-grid'

/** Bit set of connected neighbours: north 1, east 2, south 4, west 8. */
export type NeighbourMask = number

export interface AutotileChoice {
  readonly role: AutotileRole
  readonly rotation: QuarterTurns
}

export function maskOf(connected: (direction: Direction) => boolean): NeighbourMask {
  return DIRECTIONS.reduce((mask, direction, bit) => (connected(direction) ? mask | (1 << bit) : mask), 0)
}

const NORTH = 1
const EAST = 2
const SOUTH = 4
const WEST = 8

/**
 * The mask each role's model is authored for. A lone tile with no neighbours
 * has no piece of its own and renders as an `end`.
 */
const BASE_MASKS: readonly (readonly [AutotileRole, NeighbourMask])[] = [
  ['end', NORTH],
  ['straight', NORTH | SOUTH],
  ['corner', NORTH | EAST],
  ['tee', NORTH | EAST | SOUTH],
  ['cross', NORTH | EAST | SOUTH | WEST],
]

/** A clockwise quarter turn carries north to east, east to south, and so on. */
function turnClockwise(mask: NeighbourMask, turns: QuarterTurns): NeighbourMask {
  const shifted = mask << turns
  return (shifted | (shifted >> 4)) & 0b1111
}

const QUARTER_TURNS: readonly QuarterTurns[] = [0, 1, 2, 3]

export function autotile(mask: NeighbourMask): AutotileChoice {
  if ((mask & 0b1111) === 0) return { role: 'end', rotation: 0 }
  for (const [role, base] of BASE_MASKS) {
    const rotation = QUARTER_TURNS.find((turns) => turnClockwise(base, turns) === (mask & 0b1111))
    if (rotation !== undefined) return { role, rotation }
  }
  // Unreachable: the five base shapes and their turns cover all 15 non-empty masks.
  throw new Error(`autotile: no role for mask ${mask}`)
}
