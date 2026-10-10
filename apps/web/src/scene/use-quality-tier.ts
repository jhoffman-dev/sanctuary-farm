import { useCallback, useState } from 'react'
import type { QualityTier, TierVerdict } from './quality-tier'
import { readRememberedTier, rememberTier } from './quality-tier-store'

type TierState = { readonly tier: QualityTier | null; readonly reason: string }

function initialTier(forced: QualityTier | null): TierState {
  if (forced) return { tier: forced, reason: '?quality=' }
  const remembered = readRememberedTier()
  return remembered ? { tier: remembered, reason: 'remembered' } : { tier: null, reason: 'probing' }
}

/**
 * This device's quality tier: `?quality=` if given, else the one remembered
 * from an earlier visit, else `null` until the probe decides (and then
 * remembered). A forced tier is never remembered, so a test link cannot
 * leave a device stuck on it.
 */
export function useQualityTier(forced: QualityTier | null): TierState & { decide: (verdict: TierVerdict) => void } {
  const [state, setState] = useState(() => initialTier(forced))
  const decide = useCallback((verdict: TierVerdict) => {
    rememberTier(verdict.tier)
    setState(verdict)
  }, [])
  return { ...state, decide }
}
