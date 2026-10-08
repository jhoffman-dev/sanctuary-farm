import type { FarmGame } from './farm-game'
import { PADDOCK_ROUND } from './round-presets'

/**
 * What the keeper arriving at a place opens (SF-77). The place is a hotspot id
 * as plain text: `@sf/world` owns `HotspotId`, and this layer may not import
 * it, so an unknown place is simply one with nothing to do yet.
 *
 * - `practice`: the paddock's practice round is open. `started` is false when
 *   a round was already running, so the caller keeps the one on screen.
 * - `coming-soon`: the place exists, its activity does not yet.
 */
export type ArrivalOutcome =
  | { readonly kind: 'practice'; readonly started: boolean }
  | { readonly kind: 'coming-soon'; readonly place: string }

/** The one place with an activity so far; the barn, nest and the rest follow in Phase 3. */
const PRACTICE_PLACE = 'paddock'

export type HotspotArrivals = {
  /**
   * The keeper has stopped at `place`. At the paddock, waits for any save
   * still landing (a mute toggle, the last answer) and then starts the round
   * when none is running. Rejects with what `FarmGame.startRound` throws
   * otherwise (the farm not loaded).
   */
  arriveAt(place: string): Promise<ArrivalOutcome>
}

export function createHotspotArrivals(
  game: Pick<FarmGame, 'startRound' | 'roundProgress' | 'whenSaved'>,
): HotspotArrivals {
  return {
    async arriveAt(place) {
      if (place !== PRACTICE_PLACE) return { kind: 'coming-soon', place }
      await game.whenSaved()
      // Checked after the wait: the start button may have opened a round meanwhile.
      // An active round reports its planned total; an idle game reports 0 of 0.
      if (game.roundProgress().total > 0) return { kind: 'practice', started: false }
      game.startRound(PADDOCK_ROUND)
      return { kind: 'practice', started: true }
    },
  }
}
