import { describe, expect, it } from 'vitest'
import { parseWorldOverrides } from './parse-world-overrides'

const valid = {
  schemaVersion: 1,
  edits: [
    { op: 'set-ground', at: { x: -3, z: 4 }, ground: 'water' },
    { op: 'place-structure', at: { x: 0, z: 0 }, kind: 'building-wall', rotation: 2 },
    { op: 'remove-structure', at: { x: 1, z: 0 } },
    { op: 'place-decor', at: { x: 2, z: 0 }, kind: 'hay-bale', rotation: 3 },
    { op: 'remove-decor', at: { x: 3, z: 0 } },
    { op: 'move-hotspot', hotspot: 'barn', to: { x: -2, z: -12 } },
  ],
}

const withEdit = (edit: unknown) => ({ schemaVersion: 1, edits: [edit] })

describe('parseWorldOverrides', () => {
  it('accepts every edit op and rebuilds the document exactly', () => {
    const parsed = parseWorldOverrides(valid)
    expect(parsed).toEqual({ ok: true, overrides: valid })
  })

  it('accepts an empty diff', () => {
    expect(parseWorldOverrides({ schemaVersion: 1, edits: [] }).ok).toBe(true)
  })

  it.each([
    ['not an object', [], 'overrides: expected an object'],
    ['a wrong schema version', { schemaVersion: 2, edits: [] }, 'schemaVersion: expected 1'],
    ['edits that are not a list', { schemaVersion: 1, edits: {} }, 'edits: expected an array'],
    ['an unknown top-level key', { schemaVersion: 1, edits: [], seed: 3 }, 'overrides: unknown key "seed"'],
    ['an unknown op', withEdit({ op: 'paint', at: { x: 0, z: 0 } }), 'edits[0].op: expected one of'],
    ['a fractional tile', withEdit({ op: 'remove-decor', at: { x: 0.5, z: 0 } }), 'edits[0].at.x: expected an integer'],
    ['a tile given as an array', withEdit({ op: 'remove-decor', at: [0, 0] }), 'edits[0].at: expected an object'],
    ['an unknown ground', withEdit({ op: 'set-ground', at: { x: 0, z: 0 }, ground: 'lava' }), 'edits[0].ground: expected one of'],
    ['a file path for a kind', withEdit({ op: 'place-decor', at: { x: 0, z: 0 }, kind: 'tree.glb', rotation: 0 }), 'edits[0].kind'],
    ['a rotation in degrees', withEdit({ op: 'place-structure', at: { x: 0, z: 0 }, kind: 'fence', rotation: 90 }), 'edits[0].rotation: expected quarter turns'],
    ['a stray key on an edit', withEdit({ op: 'remove-structure', at: { x: 0, z: 0 }, kind: 'fence' }), 'edits[0]: unknown key "kind"'],
    ['an unknown hotspot', withEdit({ op: 'move-hotspot', hotspot: 'castle', to: { x: 0, z: 0 } }), 'edits[0].hotspot'],
    ['a __proto__ key', JSON.parse('{"schemaVersion":1,"edits":[],"__proto__":{}}'), 'forbidden key __proto__'],
  ])('rejects %s with a reason', (_name, raw, reason) => {
    const parsed = parseWorldOverrides(raw)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.reason).toContain(reason)
  })
})
