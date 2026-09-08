import type { AnimationAction } from 'three'

/**
 * Which clip is playing, and the fade between clips. three.js has no Animator
 * state machine (ADR-0001's named cost), so the "state machine" is this: one
 * active action, `crossFadeTo` on every change.
 */
export class ClipCrossfade {
  readonly #actions: ReadonlyMap<string, AnimationAction>
  #currentName: string

  constructor({ actions, initial }: { actions: ReadonlyMap<string, AnimationAction>; initial: string }) {
    this.#actions = actions
    this.#currentName = initial
    this.#require(initial).reset().play()
  }

  get currentName(): string {
    return this.#currentName
  }

  /**
   * Fade to `name` over `fadeSeconds`. Calling it with the clip already playing
   * is a no-op, so a controller may call it every frame.
   */
  fadeTo(name: string, fadeSeconds: number): void {
    if (name === this.#currentName) return
    const from = this.#require(this.#currentName)
    const to = this.#require(name)
    // `warp: false` — the clips are authored at their own cadence, and warping a
    // 24-frame walk into an idle's timing reads as a stumble.
    to.reset().play()
    from.crossFadeTo(to, fadeSeconds, false)
    this.#currentName = name
  }

  #require(name: string): AnimationAction {
    const action = this.#actions.get(name)
    if (!action) throw new Error(`spike: clip "${name}" is not in this model (${[...this.#actions.keys()].join(', ')})`)
    return action
  }
}
