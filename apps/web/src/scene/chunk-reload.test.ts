import { describe, expect, it } from 'vitest'
import { MAX_CHUNK_RELOADS, shouldReloadAfterChunkError } from './chunk-reload'

describe('shouldReloadAfterChunkError', () => {
  it('reloads a tab that has not tried yet: the chunk names changed under it', () => {
    expect(shouldReloadAfterChunkError(0)).toBe(true)
  })

  it('refuses a second reload, so a chunk that is really gone cannot loop the tab', () => {
    expect(shouldReloadAfterChunkError(MAX_CHUNK_RELOADS)).toBe(false)
    expect(shouldReloadAfterChunkError(MAX_CHUNK_RELOADS + 5)).toBe(false)
  })

  it('refuses when the count could not be read at all', () => {
    expect(shouldReloadAfterChunkError(null)).toBe(false)
  })

  it('refuses a count that is not a whole number of attempts', () => {
    expect(shouldReloadAfterChunkError(Number.NaN)).toBe(false)
    expect(shouldReloadAfterChunkError(0.5)).toBe(false)
    expect(shouldReloadAfterChunkError(Number.POSITIVE_INFINITY)).toBe(false)
  })

  it('refuses a negative count rather than treating it as room to spare', () => {
    expect(shouldReloadAfterChunkError(-1)).toBe(false)
  })

  it('allows exactly one recovery reload', () => {
    expect(MAX_CHUNK_RELOADS).toBe(1)
  })
})
