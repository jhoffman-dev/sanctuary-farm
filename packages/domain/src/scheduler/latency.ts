import type { Outcome } from '../facts/fact'
import { FLUENT_MAX_MS, LABORED_MIN_MS } from '../facts/tuning'

/**
 * A latency is a measured duration, so only a finite number ≥ 0 is meaningful.
 * NaN would classify as LABORED (every comparison is false) and demote a correct
 * answer; the application substitutes a slow-but-valid latency for a clock that
 * ran backwards before it gets here, so a stepped clock never grades FLUENT.
 */
export function assertLatency(latencyMs: number): void {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) {
    throw new RangeError(`latency must be a finite, non-negative number of ms, got ${latencyMs}`)
  }
}

export function classifyOutcome(correct: boolean, latencyMs: number): Outcome {
  if (!correct) return 'WRONG'
  if (latencyMs < FLUENT_MAX_MS) return 'FLUENT'
  if (latencyMs <= LABORED_MIN_MS) return 'SLOW'
  return 'LABORED'
}

/** A fact with no history counts as infinitely slow, so it is the first to be drilled. */
export function rollingMeanLatency(latencies: readonly number[]): number {
  if (latencies.length === 0) return Number.POSITIVE_INFINITY
  return latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length
}
