import type { QualityTier } from './quality-tier'

/** Performance budget: devicePixelRatio is capped at 1.5 on every tier. */
export const MAX_DPR = 1.5

/** What a tier draws. The high tier is the farm's full look; the low tier is the reference Chromebook's. */
export type QualitySettings = {
  /** The sun casts shadows. ADR-0004: the shadow pass is about half the draw calls. */
  readonly shadows: boolean
  /** Animals (and the resting keeper) play their idle clips; off, they hold a pose. */
  readonly idleLoops: boolean
  /** The camera's slow breathing drift. */
  readonly cameraSway: boolean
  /** The highest devicePixelRatio this tier draws at. */
  readonly maxDpr: number
}

const SETTINGS: Readonly<Record<QualityTier, QualitySettings>> = {
  high: { shadows: true, idleLoops: true, cameraSway: true, maxDpr: MAX_DPR },
  // With nothing playing at rest, a still farm draws nothing at all (`frameloop="demand"`).
  low: { shadows: false, idleLoops: false, cameraSway: false, maxDpr: 1 },
}

export function qualitySettings(tier: QualityTier): QualitySettings {
  return SETTINGS[tier]
}

/** The pixel ratio to draw at: the screen's own, never above the tier's cap, never below 1. */
export function renderDpr({ deviceDpr, maxDpr }: { deviceDpr: number; maxDpr: number }): number {
  if (!Number.isFinite(deviceDpr) || deviceDpr < 1) return 1
  return Math.min(deviceDpr, maxDpr)
}
