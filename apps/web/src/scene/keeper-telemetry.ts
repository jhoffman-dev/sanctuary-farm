import type { TileCoord } from '@sf/world'
import type { GroundPoint, LocomotionClip } from './keeper-walk'

const CLIPS_KEPT = 32

/**
 * What the keeper is doing, told by the keeper every frame and read by the
 * camera (to follow) and the `?perf=1` probe (for e2e). A plain object with
 * methods, not React state: the performance budget forbids a commit per frame.
 */
export class KeeperTelemetry {
  #position: GroundPoint
  #clip: LocomotionClip = 'idle'
  #destination: TileCoord | null = null
  readonly #clipsSeen: LocomotionClip[] = ['idle']

  constructor(position: GroundPoint) {
    this.#position = position
  }

  get position(): GroundPoint {
    return this.#position
  }

  get clip(): LocomotionClip {
    return this.#clip
  }

  /** The tile a tap sent the keeper to, while it walks there. */
  get destination(): TileCoord | null {
    return this.#destination
  }

  /** Each clip change in order, e.g. idle → walk → idle; only the most recent are kept. */
  get clipsSeen(): readonly LocomotionClip[] {
    return this.#clipsSeen
  }

  movedTo(position: GroundPoint): void {
    this.#position = position
  }

  headingFor(destination: TileCoord | null): void {
    this.#destination = destination
  }

  playing(clip: LocomotionClip): void {
    this.#clip = clip
    if (this.#clipsSeen.at(-1) === clip) return
    this.#clipsSeen.push(clip)
    if (this.#clipsSeen.length > CLIPS_KEPT) this.#clipsSeen.shift()
  }
}
