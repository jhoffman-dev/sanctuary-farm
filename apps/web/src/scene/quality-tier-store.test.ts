import { afterEach, describe, expect, it, vi } from 'vitest'
import { readRememberedTier, rememberTier } from './quality-tier-store'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('the remembered quality tier (jsdom localStorage)', () => {
  it('round-trips a tier', () => {
    expect(readRememberedTier()).toBeNull()
    rememberTier('low')
    expect(readRememberedTier()).toBe('low')
    rememberTier('high')
    expect(readRememberedTier()).toBe('high')
  })

  it('ignores a stored value that is not a tier', () => {
    window.localStorage.setItem('sanctuary-farm/quality-tier', 'ultra')
    expect(readRememberedTier()).toBeNull()
  })

  it('reads as "not remembered" and writes nothing, without throwing, when storage is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(readRememberedTier()).toBeNull()
    expect(() => rememberTier('low')).not.toThrow()
  })
})
