import { describe, expect, it } from 'vitest'
import { parseWorldSettings } from './parse-world-settings'

const valid = { schemaVersion: 1, seed: 7, chunks: [{ cx: 0, cz: 0 }, { cx: -1, cz: 0 }, { cx: 0, cz: -1 }] }

function reasonFor(raw: unknown): string {
  const parsed = parseWorldSettings(raw)
  if (parsed.ok) throw new Error('expected the settings to be rejected')
  return parsed.reason
}

describe('parseWorldSettings', () => {
  it('accepts a seed and land, and sorts the land by row then column', () => {
    const parsed = parseWorldSettings(valid)
    expect(parsed).toEqual({
      ok: true,
      settings: { schemaVersion: 1, seed: 7, chunks: [{ cx: 0, cz: -1 }, { cx: -1, cz: 0 }, { cx: 0, cz: 0 }] },
    })
  })

  it('names what is wrong instead of throwing', () => {
    expect(reasonFor(null)).toBe('world: expected an object')
    expect(reasonFor({ ...valid, extra: 1 })).toBe('world: unknown key "extra"')
    expect(reasonFor({ ...valid, schemaVersion: 2 })).toBe('schemaVersion: expected 1')
    expect(reasonFor({ ...valid, seed: 1.5 })).toBe('seed: expected an integer')
    expect(reasonFor({ ...valid, seed: -1 })).toBe('seed: expected 0 … 4294967295')
    expect(reasonFor({ ...valid, seed: 2 ** 32 })).toBe('seed: expected 0 … 4294967295')
    expect(reasonFor({ ...valid, chunks: [] })).toBe('chunks: expected at least one chunk')
    expect(reasonFor({ ...valid, chunks: [{ cx: 0, cz: 0 }, { cx: 0, cz: 0 }] })).toBe('chunks[1]: a chunk listed twice')
    expect(reasonFor({ ...valid, chunks: [{ cx: 0 }] })).toBe('chunks[0].cz: expected an integer')
    expect(reasonFor({ ...valid, chunks: [{ cx: 0, cz: 0, y: 1 }] })).toBe('chunks[0]: unknown key "y"')
  })

  it('accepts the largest seed', () => {
    expect(parseWorldSettings({ ...valid, seed: 2 ** 32 - 1 }).ok).toBe(true)
  })
})
