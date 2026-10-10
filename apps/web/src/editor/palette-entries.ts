import {
  AUTOTILE_ROLES,
  BUILDING_PART_KINDS,
  DECOR_KINDS,
  GROUND_KINDS,
  type GroundKind,
  HOTSPOT_IDS,
  type PieceId,
} from '@sf/world'
import type { Tool } from './editor-tools'

export const PALETTE_GROUPS = ['Ground', 'Paths & fences', 'Buildings', 'Decor', 'Hotspots'] as const
export type PaletteGroup = (typeof PALETTE_GROUPS)[number]

/** One button in the palette: the tool it picks and every `PieceId` it can put in the world. */
export type PaletteEntry = {
  readonly key: string
  readonly label: string
  readonly group: PaletteGroup
  readonly tool: Tool
  readonly pieceIds: readonly PieceId[]
  /** Shown under the label: what is not obvious from the name. */
  readonly note?: string
}

function words(kind: string): string {
  const spaced = kind.replaceAll('-', ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const ROLES = AUTOTILE_ROLES.join(', ')

/** Paths are ground too, but they sit with the fences: both join up with their neighbours. */
const ground: PaletteEntry[] = GROUND_KINDS.filter((kind): kind is Exclude<GroundKind, 'path'> => kind !== 'path').map(
  (kind) => ({
    key: kind,
    label: words(kind),
    group: 'Ground',
    tool: { kind: 'paint-ground', ground: kind },
    pieceIds: [kind],
  }),
)

const pathsAndFences: PaletteEntry[] = [
  {
    key: 'path',
    label: 'Path',
    group: 'Paths & fences',
    tool: { kind: 'paint-ground', ground: 'path' },
    pieceIds: AUTOTILE_ROLES.map((role): PieceId => `path:${role}`),
    note: `Ground; joins up by itself (${ROLES})`,
  },
  {
    key: 'fence',
    label: 'Fence',
    group: 'Paths & fences',
    tool: { kind: 'place-structure', structure: 'fence' },
    pieceIds: AUTOTILE_ROLES.map((role): PieceId => `fence:${role}`),
    note: `Joins up by itself (${ROLES})`,
  },
  {
    key: 'fence-gate',
    label: 'Fence gate',
    group: 'Paths & fences',
    tool: { kind: 'place-structure', structure: 'fence-gate' },
    pieceIds: ['fence-gate'],
  },
]

const buildings: PaletteEntry[] = BUILDING_PART_KINDS.map((kind) => ({
  key: kind,
  label: words(kind.replace('building-', '')),
  group: 'Buildings',
  tool: { kind: 'place-structure', structure: kind },
  pieceIds: [kind],
}))

const decor: PaletteEntry[] = DECOR_KINDS.map((kind) => ({
  key: kind,
  label: words(kind),
  group: 'Decor',
  tool: { kind: 'place-decor', decor: kind },
  pieceIds: [kind],
}))

const hotspots: PaletteEntry[] = HOTSPOT_IDS.map((id) => ({
  key: `hotspot-${id}`,
  label: words(id),
  group: 'Hotspots',
  tool: { kind: 'move-hotspot', hotspot: id },
  pieceIds: [`hotspot:${id}`],
  note: 'Click a tile to put its north-west corner there (or drag it with Move hotspot, M)',
}))

/** Every entry, in group order. Together they cover every `PieceId` (a test holds them to it). */
export const PALETTE: readonly PaletteEntry[] = [...ground, ...pathsAndFences, ...buildings, ...decor, ...hotspots]
