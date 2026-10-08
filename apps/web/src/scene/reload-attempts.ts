// How many times this tab has already reloaded to recover a missing scene
// chunk. sessionStorage, not localStorage: the count describes one tab's trip
// across one deploy and must not outlive the tab.
const KEY = 'sanctuary-farm/scene-chunk-reloads'

/** The count so far, or `null` when storage cannot be read. */
export function readReloadAttempts(): number | null {
  try {
    const stored = window.sessionStorage.getItem(KEY)
    return stored === null ? 0 : Number(stored)
  } catch {
    // Private mode, disabled site data and locked-down webviews all throw on
    // any storage access. Unknown, not zero — the reload policy declines both.
    return null
  }
}

/**
 * Counts one more recovery reload. Returns false when the count could not be
 * stored: the caller must then *not* reload, because an attempt nobody counted
 * would be made again on the next load, and again after that.
 */
export function recordReloadAttempt(previousAttempts: number): boolean {
  try {
    window.sessionStorage.setItem(KEY, String(previousAttempts + 1))
    return true
  } catch {
    return false
  }
}

/** Forgets the count, so a later deploy gets its own recovery reload. */
export function clearReloadAttempts(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // Safe to ignore: a count that cannot be cleared only makes this tab
    // decline a future reload, which is the cautious direction.
  }
}
