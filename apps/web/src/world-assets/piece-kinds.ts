/**
 * The piece vocabulary the tile world (`@sf/world`, SF-87, PR #119) asks the
 * renderer for. It mirrors `PieceId` in `packages/world/src/tile-kinds.ts`;
 * this branch cannot import that yet, so the list is restated here and a test
 * pins it. Once the branches meet, the catalogue becomes `Record<PieceId, …>`
 * and the compiler holds both sides to one list (issue #118).
 *
 * Rotation is quarter turns clockwise seen from above, from the model's
 * authored facing −Z ("north"); +X is east, +Z is south. At rotation 0:
 * - autotile roles connect: `end` north only; `straight` north and south;
 *   `corner` north and east; `tee` north, east and south; `cross` all four;
 * - a `fence-gate` sits in a north–south run;
 * - a building wall stands on the tile's north edge, running east–west; a
 *   roof's ridge runs east–west;
 * - animals and the keeper face north (art-direction §8).
 */

export const AUTOTILE_ROLES = ['end', 'straight', 'corner', 'tee', 'cross'] as const
export type AutotileRole = (typeof AUTOTILE_ROLES)[number]

export const HOTSPOT_IDS = ['barn', 'feed-shed', 'nest', 'paddock', 'training-ring', 'petting-zoo', 'farmhouse'] as const
export type HotspotId = (typeof HOTSPOT_IDS)[number]

const GROUND_KINDS = ['grass', 'dirt', 'water'] as const
const AUTOTILE_KINDS = ['fence', 'path'] as const
const STRUCTURE_KINDS = ['fence-gate', 'building-wall', 'building-wall-door', 'building-wall-window', 'building-roof'] as const
const DECOR_KINDS = ['tree', 'tree-tall', 'bush', 'rock', 'crate', 'barrel', 'hay-bale', 'crop'] as const

/** Every distinct model the world may ask for. Autotiled kinds carry their role: `"fence:corner"`. */
export type PieceId =
  | (typeof GROUND_KINDS)[number]
  | `${(typeof AUTOTILE_KINDS)[number]}:${AutotileRole}`
  | (typeof STRUCTURE_KINDS)[number]
  | (typeof DECOR_KINDS)[number]
  | `hotspot:${HotspotId}`

export const PIECE_IDS: readonly PieceId[] = [
  ...GROUND_KINDS,
  ...AUTOTILE_KINDS.flatMap((kind) => AUTOTILE_ROLES.map((role) => `${kind}:${role}` as const)),
  ...STRUCTURE_KINDS,
  ...DECOR_KINDS,
  ...HOTSPOT_IDS.map((id) => `hotspot:${id}` as const),
]

/** Animals and the keeper move, so they are looked up by who they are rather than placed as tiles. */
export const ANIMAL_SPECIES = ['cow', 'pig', 'hog', 'chick', 'bunny', 'dog'] as const
export type AnimalSpecies = (typeof ANIMAL_SPECIES)[number]

export const KEEPER_VARIANTS = ['female-a', 'female-c', 'male-a', 'male-c'] as const
export type KeeperVariant = (typeof KEEPER_VARIANTS)[number]
