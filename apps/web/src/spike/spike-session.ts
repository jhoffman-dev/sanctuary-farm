import { FrameStats } from './frame-stats'
import type { GroundVector } from './steering'

/** What `renderer.info` and the texture walk report for one published sample. */
export type SceneSample = {
  drawCalls: number
  triangles: number
  textureCount: number
  geometries: number
  programs: number
  textureBytes: number
  /** On-screen height in CSS pixels, keyed by model — the 64-px silhouette test. */
  silhouettePx: Readonly<Record<string, number>>
}

/**
 * The spike's mutable render-loop state, owned in one place.
 *
 * It is a class rather than refs threaded through props for two reasons: the
 * render loop writes it 60× a second and must not commit React state
 * (performance-budget.md), and a component that reaches into another
 * component's ref to mutate it is exactly what the React lint rules forbid.
 */
export class SpikeSession {
  readonly #stats = new FrameStats()
  #target: GroundVector | null = null
  #keeperX = 0
  #keeperZ = 0
  #clip = 'Idle'
  #firstFrameMs: number | null = null
  #readout: HTMLElement | null = null

  /** Pass as a `ref` callback on the element the numbers are published onto. */
  readonly attachReadout = (node: HTMLElement | null): void => {
    this.#readout = node
  }

  /** Where the last tap landed, or null when the keeper has nowhere to be. */
  get target(): GroundVector | null {
    return this.#target
  }

  walkTo(point: GroundVector): void {
    this.#target = point
  }

  arrived(): void {
    this.#target = null
  }

  reportKeeper({ x, z, clip }: { x: number; z: number; clip: string }): void {
    this.#keeperX = x
    this.#keeperZ = z
    this.#clip = clip
  }

  recordFrame(deltaSeconds: number, nowMs: number): void {
    this.#stats.record(deltaSeconds)
    this.#firstFrameMs ??= Math.round(nowMs)
  }

  resetStats(): void {
    this.#stats.reset()
  }

  /**
   * Write the current numbers onto the readout element as `data-*` attributes,
   * which is how the Playwright spec reads the scene without a WebGL handle.
   */
  publish(sample: SceneSample): void {
    const node = this.#readout
    if (!node) return
    node.dataset.frames = String(this.#stats.frames)
    node.dataset.fps = this.#stats.averageFps.toFixed(1)
    node.dataset.worstFps = this.#stats.worstFps.toFixed(1)
    node.dataset.drawCalls = String(sample.drawCalls)
    node.dataset.triangles = String(sample.triangles)
    node.dataset.textureCount = String(sample.textureCount)
    node.dataset.geometries = String(sample.geometries)
    node.dataset.programs = String(sample.programs)
    node.dataset.textureBytes = String(sample.textureBytes)
    node.dataset.keeperX = this.#keeperX.toFixed(3)
    node.dataset.keeperZ = this.#keeperZ.toFixed(3)
    node.dataset.clip = this.#clip
    node.dataset.firstFrameMs = String(this.#firstFrameMs ?? '')
    for (const [name, px] of Object.entries(sample.silhouettePx)) node.dataset[`silhouette${name}`] = String(px)
    node.textContent =
      `${this.#stats.averageFps.toFixed(0)} fps (worst ${this.#stats.worstFps.toFixed(0)}) · ` +
      `${sample.drawCalls} calls · ${sample.triangles.toLocaleString()} tris · ` +
      `${Math.round(sample.textureBytes / 1024)} kB tex · clip ${this.#clip}`
  }
}
