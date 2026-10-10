import { NO_OVERRIDES, type TileCoord, type WorldEdit, hotspotAt } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { buildDraftWorld } from './editor-state'
import { inspectorRows } from './inspector-rows'
import { testSession } from './test-fixtures'

const session = testSession()

function worldWith(edits: WorldEdit[]) {
  const overrides = { ...NO_OVERRIDES, edits }
  return { world: buildDraftWorld(session, { ...session.saved, overrides }), overrides }
}

const plain = worldWith([])
const paddock = plain.world.hotspots.find((hotspot) => hotspot.id === 'paddock')!
const gate = paddock.entrance

function row(rows: ReturnType<typeof inspectorRows>, label: string) {
  return rows?.find((candidate) => candidate.label === label)
}

describe('inspectorRows', () => {
  it('describes a generated tile: coordinate, chunk, layers, hotspot', () => {
    const rows = inspectorRows(plain.world, plain.overrides, gate)
    expect(row(rows, 'Tile')).toEqual({ label: 'Tile', value: `x ${gate.x}, z ${gate.z}`, source: null })
    expect(row(rows, 'Structure')?.value).toMatch(/^fence-gate \((0|90|180|270)°\) — paddock$/)
    expect(row(rows, 'Structure')?.source).toBe('generated')
    expect(row(rows, 'Hotspot')).toEqual({ label: 'Hotspot', value: 'paddock', source: 'layout' })
  })

  it('marks the layers an override decides, and a moved hotspot', () => {
    const at: TileCoord = { x: paddock.footprint.x + 1, z: paddock.footprint.z + 1 }
    const edited = worldWith([
      { op: 'set-ground', at, ground: 'path' },
      { op: 'place-decor', at, kind: 'hay-bale', rotation: 1 },
      { op: 'move-hotspot', hotspot: 'paddock', to: { x: paddock.footprint.x, z: paddock.footprint.z } },
    ])
    const rows = inspectorRows(edited.world, edited.overrides, at)
    expect(row(rows, 'Ground')).toEqual({ label: 'Ground', value: expect.stringMatching(/^path \(\w+, \d+°\)$/), source: 'overridden' })
    expect(row(rows, 'Decor')).toEqual({ label: 'Decor', value: 'hay-bale (90°)', source: 'overridden' })
    expect(row(rows, 'Hotspot')?.source).toBe('moved')
    expect(hotspotAt(edited.world, at)?.id).toBe('paddock')
  })

  it('says nothing for a tile off the land', () => {
    expect(inspectorRows(plain.world, plain.overrides, { x: 999, z: 999 })).toBeNull()
  })
})
