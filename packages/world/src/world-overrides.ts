/**
 * Authored overrides: the small diff James's hand edits leave on top of the
 * generated world. The world is always rebuilt as generate(seed) + overrides,
 * so regenerating can never lose an edit — the edit is an input, not a patch
 * to generated output.
 *
 * Moving a hotspot changes what is generated (the path has to reach it), so
 * moves apply to the anchors *before* generation; every other edit applies to
 * tiles *after* it, in file order, the later edit winning.
 */
import type { DraftTile } from './chunk-base'
import type { HotspotAnchor } from './hotspot-anchors'
import { moveAnchor } from './hotspot-anchors'
import type { DecorKind, GroundKind, QuarterTurns, StructureKind } from './tile-kinds'
import type { ChunkCoord, TileCoord } from './tile-grid'
import { chunkOf, indexInChunk, sameChunk } from './tile-grid'
import type { HotspotId } from './world-layout'

export const OVERRIDES_SCHEMA_VERSION = 1

export type TileEdit =
  | { readonly op: 'set-ground'; readonly at: TileCoord; readonly ground: GroundKind }
  | { readonly op: 'place-structure'; readonly at: TileCoord; readonly kind: StructureKind; readonly rotation: QuarterTurns }
  | { readonly op: 'remove-structure'; readonly at: TileCoord }
  | { readonly op: 'place-decor'; readonly at: TileCoord; readonly kind: DecorKind; readonly rotation: QuarterTurns }
  | { readonly op: 'remove-decor'; readonly at: TileCoord }

/** `to` is the new north-west corner of the hotspot's footprint. */
export interface HotspotMove {
  readonly op: 'move-hotspot'
  readonly hotspot: HotspotId
  readonly to: TileCoord
}

export type WorldEdit = TileEdit | HotspotMove

export const WORLD_EDIT_OPS = [
  'set-ground',
  'place-structure',
  'remove-structure',
  'place-decor',
  'remove-decor',
  'move-hotspot',
] as const satisfies readonly WorldEdit['op'][]

export interface WorldOverrides {
  readonly schemaVersion: typeof OVERRIDES_SCHEMA_VERSION
  readonly edits: readonly WorldEdit[]
}

export const NO_OVERRIDES: WorldOverrides = { schemaVersion: OVERRIDES_SCHEMA_VERSION, edits: [] }

export function applyHotspotMoves(anchors: readonly HotspotAnchor[], overrides: WorldOverrides): HotspotAnchor[] {
  return overrides.edits.reduce<HotspotAnchor[]>(
    (moved, edit) =>
      edit.op === 'move-hotspot'
        ? moved.map((anchor) => (anchor.id === edit.hotspot ? moveAnchor(anchor, edit.to) : anchor))
        : moved,
    [...anchors],
  )
}

function withoutDecor(tile: DraftTile): DraftTile {
  const { decor: _removed, ...rest } = tile
  return rest
}

function withoutStructure(tile: DraftTile): DraftTile {
  const { structure: _removed, ...rest } = tile
  return rest
}

function applyTileEdit(tile: DraftTile, edit: TileEdit): DraftTile {
  switch (edit.op) {
    case 'set-ground': {
      // Paths and water stay clear of decor, edited or generated.
      const cleared = edit.ground === 'path' || edit.ground === 'water' ? withoutDecor(tile) : tile
      return { ...cleared, ground: edit.ground }
    }
    case 'place-structure':
      return { ...tile, structure: { kind: edit.kind, rotation: edit.rotation } }
    case 'remove-structure':
      return withoutStructure(tile)
    case 'place-decor':
      return { ...tile, decor: { kind: edit.kind, rotation: edit.rotation } }
    case 'remove-decor':
      return withoutDecor(tile)
  }
}

/** The chunk's tiles with every tile edit that lands in it applied, in order. */
export function applyTileEdits(tiles: readonly DraftTile[], chunk: ChunkCoord, overrides: WorldOverrides): DraftTile[] {
  const edited = [...tiles]
  for (const edit of overrides.edits) {
    if (edit.op === 'move-hotspot' || !sameChunk(chunkOf(edit.at), chunk)) continue
    const index = indexInChunk(edit.at)
    edited[index] = applyTileEdit(edited[index] as DraftTile, edit)
  }
  return edited
}
