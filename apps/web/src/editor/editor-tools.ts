import type { DecorKind, GroundKind, HotspotId, PieceId, QuarterTurns, StructureKind, TileCoord, WorldEdit } from '@sf/world'

/**
 * What a left click or drag on the land does. Choosing a palette entry picks
 * a tool; the editor's own buttons pick the rest.
 */
export type Tool =
  | { readonly kind: 'select' }
  | { readonly kind: 'paint-ground'; readonly ground: GroundKind }
  | { readonly kind: 'place-structure'; readonly structure: StructureKind }
  | { readonly kind: 'place-decor'; readonly decor: DecorKind }
  | { readonly kind: 'erase' }
  /** `hotspot` set: a click puts that hotspot there. Unset: drag a hotspot by its footprint. */
  | { readonly kind: 'move-hotspot'; readonly hotspot?: HotspotId }
  | { readonly kind: 'add-land' }

export const SELECT_TOOL: Tool = { kind: 'select' }

/** The edit a click with a placing tool makes, or `null` for tools that do not place. */
export function editForTool(tool: Tool, at: TileCoord, rotation: QuarterTurns): WorldEdit | null {
  switch (tool.kind) {
    case 'paint-ground':
      return { op: 'set-ground', at, ground: tool.ground }
    case 'place-structure':
      return { op: 'place-structure', at, kind: tool.structure, rotation }
    case 'place-decor':
      return { op: 'place-decor', at, kind: tool.decor, rotation }
    default:
      return null
  }
}

/** What the cursor previews on the hovered tile before a click. */
export type Ghost =
  | { readonly kind: 'none' }
  | { readonly kind: 'ground'; readonly ground: GroundKind }
  | { readonly kind: 'piece'; readonly pieceId: PieceId; readonly rotation: QuarterTurns }
  | { readonly kind: 'erase' }

/** A fence is autotiled once placed; alone under the cursor it previews as a straight run. */
export function ghostFor(tool: Tool, rotation: QuarterTurns): Ghost {
  switch (tool.kind) {
    case 'paint-ground':
      return { kind: 'ground', ground: tool.ground }
    case 'place-structure':
      return { kind: 'piece', pieceId: tool.structure === 'fence' ? 'fence:straight' : tool.structure, rotation }
    case 'place-decor':
      return { kind: 'piece', pieceId: tool.decor, rotation }
    case 'erase':
      return { kind: 'erase' }
    default:
      return { kind: 'none' }
  }
}

/** Whether a left drag on the land belongs to the tool (painting, dragging a hotspot) rather than the camera. */
export function toolOwnsDrag(tool: Tool): boolean {
  return tool.kind !== 'select' && tool.kind !== 'add-land'
}

export function nextQuarterTurn(rotation: QuarterTurns): QuarterTurns {
  return ((rotation + 1) % 4) as QuarterTurns
}

export function sameTool(one: Tool, other: Tool): boolean {
  return JSON.stringify(one) === JSON.stringify(other)
}
