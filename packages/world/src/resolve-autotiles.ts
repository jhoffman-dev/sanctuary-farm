/**
 * The last step: every path and fence learns its piece and rotation from its
 * neighbours. Neighbours across a chunk edge are read from that chunk's
 * generated-plus-edited tiles whether or not it is in the world yet, which is
 * what keeps an existing edge tile unchanged when the land beside it arrives.
 */
import type { DraftStructure, DraftTile } from './chunk-base'
import { autotile, maskOf } from './autotile'
import type { GroundPiece, StructurePiece } from './tile-kinds'
import type { TileCoord } from './tile-grid'
import { neighbour } from './tile-grid'
import type { Tile } from './tile-world-types'

export type TileLookup = (tile: TileCoord) => DraftTile

function isFencing(structure: DraftStructure | undefined): boolean {
  return structure?.kind === 'fence' || structure?.kind === 'fence-gate'
}

/** Fences only join fences of the same enclosure (or, for authored fences, of none). */
function joinsFence(own: DraftStructure, other: DraftStructure | undefined): boolean {
  return isFencing(other) && other?.enclosure === own.enclosure
}

function resolveGround(tile: TileCoord, draft: DraftTile, lookup: TileLookup): GroundPiece {
  if (draft.ground !== 'path') return { kind: draft.ground }
  const { role, rotation } = autotile(maskOf((side) => lookup(neighbour(tile, side)).ground === 'path'))
  return { kind: 'path', role, rotation }
}

function resolveStructure(tile: TileCoord, structure: DraftStructure, lookup: TileLookup): StructurePiece {
  const enclosure = structure.enclosure === undefined ? {} : { enclosure: structure.enclosure }
  const { kind } = structure
  if (kind !== 'fence' && kind !== 'fence-gate') return { kind, rotation: structure.rotation, ...enclosure }
  const choice = autotile(maskOf((side) => joinsFence(structure, lookup(neighbour(tile, side)).structure)))
  // A gate takes the line of the fence it sits in; it has no corner or tee of its own.
  if (kind === 'fence-gate') return { kind: 'fence-gate', rotation: choice.rotation, ...enclosure }
  return { kind: 'fence', role: choice.role, rotation: choice.rotation, ...enclosure }
}

export function resolveTile(tile: TileCoord, draft: DraftTile, lookup: TileLookup): Tile {
  const ground = resolveGround(tile, draft, lookup)
  const structure = draft.structure === undefined ? {} : { structure: resolveStructure(tile, draft.structure, lookup) }
  const decor = draft.decor === undefined ? {} : { decor: draft.decor }
  return { ground, ...structure, ...decor }
}
