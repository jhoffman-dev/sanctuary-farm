/**
 * Tile pieces are named by `@sf/world`'s `PieceId` (`'fence:corner'`,
 * `'hotspot:barn'`, …); the catalogue is a `Record<PieceId, …>` so a kind the
 * world adds fails the build until it is mapped (issue #118).
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

/** Animals and the keeper move, so they are looked up by who they are rather than placed as tiles. */
export const ANIMAL_SPECIES = ['cow', 'pig', 'hog', 'chick', 'bunny', 'dog'] as const
export type AnimalSpecies = (typeof ANIMAL_SPECIES)[number]

export const KEEPER_VARIANTS = ['female-a', 'female-c', 'male-a', 'male-c'] as const
export type KeeperVariant = (typeof KEEPER_VARIANTS)[number]
