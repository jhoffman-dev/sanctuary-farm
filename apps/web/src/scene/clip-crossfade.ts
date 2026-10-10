import type { AnimationAction } from 'three'
import type { LocomotionClip } from './keeper-walk'

/** ADR-0004: a quarter-second fade reads as a change of pace, not a pop. */
export const CROSSFADE_SECONDS = 0.25

/**
 * Which clip is playing, and the fade between them (ADR-0004): one active
 * action, `crossFadeTo` on every change. Fading to the clip already playing
 * is a no-op, so the frame loop may call it every frame.
 */
export class ClipCrossfade {
  readonly #actions: Readonly<Record<LocomotionClip, AnimationAction>>
  #current: LocomotionClip

  constructor(actions: Readonly<Record<LocomotionClip, AnimationAction>>) {
    this.#actions = actions
    this.#current = 'idle'
    actions.idle.reset().play()
  }

  fadeTo(next: LocomotionClip): void {
    if (next === this.#current) return
    const to = this.#actions[next]
    // `warp: false`: warping a walk cycle into the idle's timing reads as a stumble.
    to.reset().play()
    this.#actions[this.#current].crossFadeTo(to, CROSSFADE_SECONDS, false)
    this.#current = next
  }

  stop(): void {
    this.#actions.idle.stop()
    this.#actions.walk.stop()
  }
}
