/**
 * A rolling FPS estimate for the spike's measurement overlay. Kept apart from
 * the renderer so the maths is unit-testable and so nothing here allocates or
 * commits React state inside `useFrame` (performance-budget.md, runtime table).
 */
export class FrameStats {
  #elapsedSeconds = 0
  #frames = 0
  #worstFrameSeconds = 0

  /** Record one rendered frame. Non-finite or non-positive deltas are ignored. */
  record(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return
    this.#elapsedSeconds += deltaSeconds
    this.#frames += 1
    this.#worstFrameSeconds = Math.max(this.#worstFrameSeconds, deltaSeconds)
  }

  get frames(): number {
    return this.#frames
  }

  get elapsedSeconds(): number {
    return this.#elapsedSeconds
  }

  /** Mean frames per second over everything recorded; 0 before the first frame. */
  get averageFps(): number {
    return this.#elapsedSeconds > 0 ? this.#frames / this.#elapsedSeconds : 0
  }

  /** The slowest frame seen, expressed as fps — the "1 % low" stand-in. */
  get worstFps(): number {
    return this.#worstFrameSeconds > 0 ? 1 / this.#worstFrameSeconds : 0
  }

  reset(): void {
    this.#elapsedSeconds = 0
    this.#frames = 0
    this.#worstFrameSeconds = 0
  }
}
