import type { Outcome } from '../facts/fact'
import { FLUENT_MAX_MS, LABORED_MIN_MS } from '../facts/tuning'

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
