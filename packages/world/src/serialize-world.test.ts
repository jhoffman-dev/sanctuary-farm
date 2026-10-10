import { describe, expect, it } from 'vitest'
import { parseWorldOverrides } from './parse-world-overrides'
import { parseWorldSettings } from './parse-world-settings'
import { serializeWorldOverrides, serializeWorldSettings } from './serialize-world'
import type { WorldOverrides } from './world-overrides'
import { NO_OVERRIDES } from './world-overrides'

const everyOp: WorldOverrides = {
  schemaVersion: 1,
  edits: [
    { op: 'set-ground', at: { x: 1, z: -2 }, ground: 'dirt' },
    { op: 'place-structure', at: { x: 3, z: 4 }, kind: 'fence', rotation: 1 },
    { op: 'remove-structure', at: { x: 3, z: 5 } },
    { op: 'place-decor', at: { x: -6, z: 0 }, kind: 'hay-bale', rotation: 3 },
    { op: 'remove-decor', at: { x: 0, z: 0 } },
    { op: 'move-hotspot', hotspot: 'farmhouse', to: { x: -9, z: 4 } },
  ],
}

describe('serializeWorldOverrides', () => {
  it('writes an empty file exactly as the shipped one', () => {
    expect(serializeWorldOverrides(NO_OVERRIDES)).toBe('{\n  "schemaVersion": 1,\n  "edits": []\n}\n')
  })

  it('writes one edit per line, keys in a fixed order', () => {
    const lines = serializeWorldOverrides(everyOp).split('\n')
    expect(lines[3]).toBe('    { "op": "set-ground", "at": { "x": 1, "z": -2 }, "ground": "dirt" },')
    expect(lines[4]).toBe('    { "op": "place-structure", "at": { "x": 3, "z": 4 }, "kind": "fence", "rotation": 1 },')
    expect(lines[8]).toBe('    { "op": "move-hotspot", "hotspot": "farmhouse", "to": { "x": -9, "z": 4 } }')
  })

  it('round-trips through the parser for every op', () => {
    expect(parseWorldOverrides(JSON.parse(serializeWorldOverrides(everyOp)))).toEqual({ ok: true, overrides: everyOp })
  })

  it('gives the same text whatever key order the edits were built in', () => {
    const shuffled: WorldOverrides = { edits: [{ ground: 'dirt', at: { z: -2, x: 1 }, op: 'set-ground' }], schemaVersion: 1 }
    expect(serializeWorldOverrides(shuffled)).toBe(serializeWorldOverrides({ ...NO_OVERRIDES, edits: [everyOp.edits[0]!] }))
  })
})

describe('serializeWorldSettings', () => {
  it('writes one chunk per line and round-trips through the parser', () => {
    const settings = { schemaVersion: 1, seed: 42, chunks: [{ cx: 0, cz: -1 }, { cx: 1, cz: 0 }] } as const
    const text = serializeWorldSettings(settings)
    expect(text).toBe('{\n  "schemaVersion": 1,\n  "seed": 42,\n  "chunks": [\n    { "cx": 0, "cz": -1 },\n    { "cx": 1, "cz": 0 }\n  ]\n}\n')
    expect(parseWorldSettings(JSON.parse(text))).toEqual({ ok: true, settings })
  })
})
