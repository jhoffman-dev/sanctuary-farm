import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearReloadAttempts, readReloadAttempts, recordReloadAttempt } from './reload-attempts'

const KEY = 'sanctuary-farm/scene-chunk-reloads'

/** A browser that refuses site data — private mode, or a locked-down webview. */
function stubUnavailableStorage() {
  const deny = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError')
  }
  vi.stubGlobal('sessionStorage', { getItem: deny, setItem: deny, removeItem: deny })
}

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readReloadAttempts', () => {
  it('is zero for a tab that has never reloaded', () => {
    expect(readReloadAttempts()).toBe(0)
  })

  it('reads back what was recorded', () => {
    recordReloadAttempt(0)
    expect(readReloadAttempts()).toBe(1)
  })

  it('is null — unknown, not zero — when storage cannot be read', () => {
    stubUnavailableStorage()
    expect(readReloadAttempts()).toBeNull()
  })
})

describe('recordReloadAttempt', () => {
  it('counts the attempt and says so', () => {
    expect(recordReloadAttempt(0)).toBe(true)
    expect(window.sessionStorage.getItem(KEY)).toBe('1')
  })

  it('reports failure when the attempt could not be stored, so the caller does not reload uncounted', () => {
    stubUnavailableStorage()
    expect(recordReloadAttempt(0)).toBe(false)
  })
})

describe('clearReloadAttempts', () => {
  it('forgets the count once the chunk has arrived, freeing a later deploy to reload', () => {
    recordReloadAttempt(0)

    clearReloadAttempts()

    expect(readReloadAttempts()).toBe(0)
  })

  it('does not throw where storage is unavailable', () => {
    stubUnavailableStorage()
    expect(() => clearReloadAttempts()).not.toThrow()
  })
})
