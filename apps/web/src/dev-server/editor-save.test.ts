import { NO_OVERRIDES, parseWorldOverrides, parseWorldSettings } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { prepareEditorSave } from './editor-save'
import { editorSaveRoute, editorSaveTarget } from './editor-save-routes'

describe('the save routes', () => {
  it('names a target for each save route and nothing else', () => {
    expect(editorSaveTarget(editorSaveRoute('overrides'))).toBe('overrides')
    expect(editorSaveTarget(editorSaveRoute('world'))).toBe('world')
    expect(editorSaveTarget('/__editor/farm')).toBeNull()
    expect(editorSaveTarget('/src/main.tsx')).toBeNull()
  })
})

describe('prepareEditorSave', () => {
  it('writes valid overrides in the canonical text, whatever the body’s key order', () => {
    const body = JSON.stringify({ edits: [{ ground: 'dirt', at: { z: 2, x: 1 }, op: 'set-ground' }], schemaVersion: 1 })
    const prepared = prepareEditorSave('overrides', body)
    if (!prepared.ok) throw new Error(prepared.reason)
    expect(prepared.contents).toContain('{ "op": "set-ground", "at": { "x": 1, "z": 2 }, "ground": "dirt" }')
    expect(parseWorldOverrides(JSON.parse(prepared.contents)).ok).toBe(true)
  })

  it('writes valid world settings', () => {
    const prepared = prepareEditorSave('world', JSON.stringify({ schemaVersion: 1, seed: 3, chunks: [{ cx: 0, cz: 0 }] }))
    if (!prepared.ok) throw new Error(prepared.reason)
    expect(parseWorldSettings(JSON.parse(prepared.contents))).toEqual({
      ok: true,
      settings: { schemaVersion: 1, seed: 3, chunks: [{ cx: 0, cz: 0 }] },
    })
  })

  it('refuses a body that is not JSON', () => {
    expect(prepareEditorSave('overrides', '{ nope')).toEqual({ ok: false, reason: expect.stringMatching(/^the body is not JSON — /) })
  })

  it('refuses overrides the game could not load, naming the file and the field', () => {
    const body = JSON.stringify({ ...NO_OVERRIDES, edits: [{ op: 'set-ground', at: { x: 0, z: 0 }, ground: 'lava' }] })
    expect(prepareEditorSave('overrides', body)).toEqual({
      ok: false,
      reason: 'overrides.json was not saved — edits[0].ground: expected one of grass, dirt, path, water',
    })
  })

  it('refuses world settings the game could not load', () => {
    expect(prepareEditorSave('world', JSON.stringify({ schemaVersion: 1, seed: 1, chunks: [] }))).toEqual({
      ok: false,
      reason: 'world.json was not saved — chunks: expected at least one chunk',
    })
  })
})
