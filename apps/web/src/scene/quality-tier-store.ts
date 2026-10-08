import { isQualityTier, type QualityTier } from './quality-tier'

// The tier the probe picked for this device. localStorage, not sessionStorage:
// the device does not get faster between visits, and probing on every load
// would draw the first seconds of each visit on the wrong tier.
const KEY = 'sanctuary-farm/quality-tier'

/** The remembered tier, or `null` when there is none, it is not a tier, or storage cannot be read. */
export function readRememberedTier(): QualityTier | null {
  try {
    const stored = window.localStorage.getItem(KEY)
    return isQualityTier(stored) ? stored : null
  } catch {
    // Private mode and locked-down webviews throw on any storage access. The
    // device is then probed again next visit, which costs a second, not a bug.
    return null
  }
}

export function rememberTier(tier: QualityTier): void {
  try {
    window.localStorage.setItem(KEY, tier)
  } catch {
    // Safe to ignore: an unremembered tier is only probed again next visit.
  }
}
