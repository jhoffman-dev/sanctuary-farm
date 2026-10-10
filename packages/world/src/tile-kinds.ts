/**
 * The vocabulary the tile world is written in. `@sf/world` knows *kinds*, never
 * files: an adapter in `apps/web` maps every `PieceId` to a Kenney GLB, and
 * typing that map as `Record<PieceId, …>` makes the compiler hold both sides to
 * the same list (issue #118).
 */
import type { HotspotId } from './world-layout'
import { HOTSPOT_IDS } from './world-layout'

export const GROUND_KINDS = ['grass', 'dirt', 'path', 'water'] as const
export type GroundKind = (typeof GROUND_KINDS)[number]

/** The kinds whose piece and rotation come from their neighbours. `path` is a ground kind as well. */
export const AUTOTILE_KINDS = ['fence', 'path'] as const
export type AutotileKind = (typeof AUTOTILE_KINDS)[number]

export const AUTOTILE_ROLES = ['end', 'straight', 'corner', 'tee', 'cross'] as const
export type AutotileRole = (typeof AUTOTILE_ROLES)[number]

/** Placeholder building parts stand in until the farm structures are sourced (ADR-0003 gaps). */
export const BUILDING_PART_KINDS = [
  'building-wall',
  'building-wall-door',
  'building-wall-window',
  'building-roof',
] as const
export type BuildingPartKind = (typeof BUILDING_PART_KINDS)[number]

export const STRUCTURE_KINDS = ['fence', 'fence-gate', ...BUILDING_PART_KINDS] as const
export type StructureKind = (typeof STRUCTURE_KINDS)[number]

export const DECOR_KINDS = ['tree', 'tree-tall', 'bush', 'rock', 'crate', 'barrel', 'hay-bale', 'crop'] as const
export type DecorKind = (typeof DECOR_KINDS)[number]

/** Quarter turns clockwise seen from above, from the model's authored facing (−Z, "north"). */
export type QuarterTurns = 0 | 1 | 2 | 3

export type GroundPiece =
  | { readonly kind: 'path'; readonly role: AutotileRole; readonly rotation: QuarterTurns }
  | { readonly kind: Exclude<GroundKind, 'path'> }

/**
 * `enclosure` names the hotspot a generated fence belongs to: fences only join
 * their own enclosure, so two pens built side by side stay two pens.
 */
export type StructurePiece =
  | {
      readonly kind: 'fence'
      readonly role: AutotileRole
      readonly rotation: QuarterTurns
      readonly enclosure?: HotspotId
    }
  | {
      readonly kind: Exclude<StructureKind, 'fence'>
      readonly rotation: QuarterTurns
      readonly enclosure?: HotspotId
    }

export interface DecorPiece {
  readonly kind: DecorKind
  readonly rotation: QuarterTurns
}

/** Every distinct model the renderer may be asked for. Autotiled kinds carry their role: `"fence:corner"`. */
export type PieceId =
  | Exclude<GroundKind, 'path'>
  | `${AutotileKind}:${AutotileRole}`
  | Exclude<StructureKind, 'fence'>
  | DecorKind
  | `hotspot:${HotspotId}`

export const PIECE_IDS: readonly PieceId[] = [
  ...GROUND_KINDS.filter((kind): kind is Exclude<GroundKind, 'path'> => kind !== 'path'),
  ...AUTOTILE_KINDS.flatMap((kind) => AUTOTILE_ROLES.map((role): PieceId => `${kind}:${role}`)),
  ...STRUCTURE_KINDS.filter((kind): kind is Exclude<StructureKind, 'fence'> => kind !== 'fence'),
  ...DECOR_KINDS,
  ...HOTSPOT_IDS.map((id): PieceId => `hotspot:${id}`),
]

/** The model a placed piece needs. */
export function pieceIdOf(piece: GroundPiece | StructurePiece | DecorPiece): PieceId {
  return 'role' in piece ? `${piece.kind}:${piece.role}` : piece.kind
}
