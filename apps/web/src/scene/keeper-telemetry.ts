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
  #yaw = 0
  #cue: TileCoord | null = null
  #cuesShown = 0
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

  /** Radians about +Y, as `KeeperWalk.yaw`. */
  get yaw(): number {
    return this.#yaw
  }

  /** The tile showing the "can't get there" cue, while it shows. */
  get cue(): TileCoord | null {
    return this.#cue
  }

  /** How many cues have been shown, so a test cannot miss one that came and went between two looks. */
  get cuesShown(): number {
    return this.#cuesShown
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

  turnedTo(yaw: number): void {
    this.#yaw = yaw
  }

  cueing(tile: TileCoord | null): void {
    this.#cue = tile
    if (tile) this.#cuesShown += 1
  }

  playing(clip: LocomotionClip): void {
    this.#clip = clip
    if (this.#clipsSeen.at(-1) === clip) return
    this.#clipsSeen.push(clip)
    if (this.#clipsSeen.length > CLIPS_KEPT) this.#clipsSeen.shift()
  }
}
