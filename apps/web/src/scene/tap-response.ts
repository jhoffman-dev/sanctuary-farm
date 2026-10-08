/**
 * What a tap on the ground does (SF-89). Whether a tile can be reached is
 * `@sf/world`'s call (`planWalk`); this only turns its answer into what the
 * keeper does next, so the keeper component never branches on a route itself.
 */
import { planWalk, type TileCoord, type TileWorld } from '@sf/world'

export type TapResponse =
  /** Walk `route` (it starts on the keeper's own tile) and mark `goal`. */
  | { readonly kind: 'walk'; readonly route: readonly TileCoord[]; readonly goal: TileCoord }
  /**
   * No way there: the keeper stays as it is and the tapped tile gets a brief,
   * gentle cue — never a sound, a red flash or words (game rule 6).
   */
  | { readonly kind: 'unreachable'; readonly tapped: TileCoord }

export function respondToTap({ world, from, tapped }: { world: TileWorld; from: TileCoord; tapped: TileCoord }): TapResponse {
  const route = planWalk(world, from, tapped)
  const goal = route?.at(-1)
  if (!route || !goal) return { kind: 'unreachable', tapped }
  return { kind: 'walk', route, goal }
}
