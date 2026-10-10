import { describe, expect, it } from 'vitest'
import type { WorldDraft } from './world-draft'
import { countPendingChanges, sameDraft, withChunk, withOverrides, withSeed } from './world-draft'
import type { WorldEdit } from './world-overrides'
import { NO_OVERRIDES } from './world-overrides'

const saved: WorldDraft = {
  settings: { schemaVersion: 1, seed: 1, chunks: [{ cx: 0, cz: 0 }] },
  overrides: { ...NO_OVERRIDES, edits: [{ op: 'set-ground', at: { x: 1, z: 1 }, ground: 'dirt' }] },
}
const tree: WorldEdit = { op: 'place-decor', at: { x: 2, z: 2 }, kind: 'tree', rotation: 0 }

describe('a world draft', () => {
  it('changes seed without touching the overrides', () => {
    const reseeded = withSeed(saved, 99)
    expect(reseeded.settings.seed).toBe(99)
    expect(reseeded.overrides).toBe(saved.overrides)
  })

  it('adds land in row order, and adding land it has is no change', () => {
    const grown = withChunk(withChunk(saved, { cx: 1, cz: -1 }), { cx: -1, cz: 0 })
    expect(grown.settings.chunks).toEqual([{ cx: 1, cz: -1 }, { cx: -1, cz: 0 }, { cx: 0, cz: 0 }])
    expect(withChunk(saved, { cx: 0, cz: 0 })).toBe(saved)
  })

  it('compares by what would be written to disk', () => {
    expect(sameDraft(saved, structuredClone(saved))).toBe(true)
    expect(sameDraft(saved, withSeed(saved, 2))).toBe(false)
    expect(sameDraft(saved, withOverrides(saved, NO_OVERRIDES))).toBe(false)
  })
})

describe('countPendingChanges', () => {
  it('is zero for the saved draft', () => {
    expect(countPendingChanges(saved, saved)).toBe(0)
  })

  it('counts added and removed edits, added land and a new seed', () => {
    const changed = withChunk(withSeed(withOverrides(saved, { ...NO_OVERRIDES, edits: [tree] }), 5), { cx: 1, cz: 0 })
    expect(countPendingChanges(saved, changed)).toBe(2 + 1 + 1)
  })

  it('counts repeated identical edits one by one', () => {
    const twice = withOverrides(saved, { ...NO_OVERRIDES, edits: [...saved.overrides.edits, tree, tree] })
    expect(countPendingChanges(saved, twice)).toBe(2)
  })
})
