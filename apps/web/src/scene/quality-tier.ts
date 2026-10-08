/**
 * Which look a device can afford (docs/performance-budget.md, "quality tier
 * switch"). Pure: the probe gathers the signals, this decides.
 */
export type QualityTier = 'low' | 'high'

export const QUALITY_TIERS: readonly QualityTier[] = ['low', 'high']

export function isQualityTier(value: unknown): value is QualityTier {
  return QUALITY_TIERS.some((tier) => tier === value)
}

/** What the browser will tell us about the device; `null` where it will not. */
export type DeviceSignals = {
  /** `WEBGL_debug_renderer_info`'s unmasked renderer, else the plain `RENDERER`. */
  readonly gpuRenderer: string | null
  /** `navigator.hardwareConcurrency`. */
  readonly logicalCores: number | null
  /** `navigator.deviceMemory` (Chromium only), in GB, rounded down by the browser and capped at 8. */
  readonly memoryGb: number | null
}

/** The budget's tier rule: a device under 45 fps on the high tier gets the low one. */
export const LOW_TIER_FRAME_MS = 1000 / 45

/** No GPU at all: the CPU is drawing the farm. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i
/** Entry-level GPUs of the reference class: Gemini/Apollo Lake Intel, old Mali, old Adreno, PowerVR. */
const ENTRY_LEVEL_GPU = /\b(?:u?hd graphics (?:400|405|500|505|600|605)\b|mali-(?:t|4|g31|g51|g52)|adreno \(tm\) [34]\d\d|powervr)/i
/** Safari's masked renderer. WebKit also clamps `hardwareConcurrency` to 2 on iOS, so there the core count says nothing. */
const IOS_MASKED_RENDERER = /^apple gpu$/i

/** Why a device got its tier, for the probe's `data-*` attribute and the tests. */
export type TierVerdict = { readonly tier: QualityTier; readonly reason: string }

/**
 * Signals that are enough on their own to say "low" — checked before any frame
 * is sampled, so a Chromebook never draws a single shadowed frame. `null`
 * means "can't tell yet; sample frames".
 */
export function lowTierFromSignals({ gpuRenderer, logicalCores, memoryGb }: DeviceSignals): TierVerdict | null {
  const renderer = gpuRenderer ?? ''
  if (SOFTWARE_RENDERER.test(renderer)) return { tier: 'low', reason: 'software renderer' }
  if (ENTRY_LEVEL_GPU.test(renderer)) return { tier: 'low', reason: 'entry-level GPU' }
  if (logicalCores !== null && logicalCores <= 2 && !IOS_MASKED_RENDERER.test(renderer)) {
    return { tier: 'low', reason: 'two cores or fewer' }
  }
  if (memoryGb !== null && memoryGb <= 2) return { tier: 'low', reason: '2 GB of memory or less' }
  return null
}

/** Frames skipped before sampling: the first ones upload models and compile shaders. */
export const WARM_UP_FRAMES = 10
/** About a second at 60 fps: enough to see a slow device, short enough to be over before the child looks up. */
export const SAMPLE_FRAMES = 60

/** Collects frame times after the warm-up; hands back the full sample once, then nothing. */
export class FrameSampler {
  #framesSeen = 0
  readonly #frameMs: number[] = []

  /** Adds a frame; returns the sample on the frame that completes it, else `null`. */
  add(frameMs: number): readonly number[] | null {
    this.#framesSeen += 1
    if (this.#framesSeen <= WARM_UP_FRAMES || this.#frameMs.length >= SAMPLE_FRAMES) return null
    this.#frameMs.push(frameMs)
    return this.#frameMs.length === SAMPLE_FRAMES ? this.#frameMs : null
  }
}

/** The middle frame time of a sample, in ms; `null` for an empty sample. */
export function medianFrameMs(frameMs: readonly number[]): number | null {
  if (frameMs.length === 0) return null
  const sorted = [...frameMs].sort((one, other) => one - other)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? (sorted[middle] ?? null) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

/**
 * The whole classifier: hard signals first, then the frame sample taken on
 * the high tier. With no sample (reduced motion draws on demand, so there are
 * no frames to time) and no hard signal, the device keeps the high tier.
 */
export function classifyDevice(signals: DeviceSignals, frameMs: readonly number[]): TierVerdict {
  const fromSignals = lowTierFromSignals(signals)
  if (fromSignals) return fromSignals
  const median = medianFrameMs(frameMs)
  if (median !== null && median > LOW_TIER_FRAME_MS) return { tier: 'low', reason: `slow frames (${median.toFixed(1)} ms)` }
  return { tier: 'high', reason: median === null ? 'no hard signal, no frame sample' : `frames at ${median.toFixed(1)} ms` }
}

