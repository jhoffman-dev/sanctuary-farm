import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { readRememberedTier, rememberTier } from './quality-tier-store'
import { useQualityTier } from './use-quality-tier'

afterEach(() => window.localStorage.clear())

describe('useQualityTier', () => {
  it('probes on a first visit, then remembers what the probe decided', () => {
    const { result } = renderHook(() => useQualityTier(null))
    expect(result.current.tier).toBeNull()

    act(() => result.current.decide({ tier: 'low', reason: 'entry-level GPU' }))

    expect(result.current).toMatchObject({ tier: 'low', reason: 'entry-level GPU' })
    expect(readRememberedTier()).toBe('low')
  })

  it('skips the probe on a later visit', () => {
    rememberTier('high')
    expect(renderHook(() => useQualityTier(null)).result.current).toMatchObject({ tier: 'high', reason: 'remembered' })
  })

  it('lets ?quality= override the remembered tier without overwriting it', () => {
    rememberTier('high')
    const { result } = renderHook(() => useQualityTier('low'))
    expect(result.current).toMatchObject({ tier: 'low', reason: '?quality=' })
    expect(readRememberedTier()).toBe('high')
  })
})
