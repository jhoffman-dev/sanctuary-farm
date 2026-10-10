/**
 * The world editor's operations (#105): edits win, the overrides file stays
 * minimal (an edit that restores the generated value removes the override),
 * erase takes the top layer off, and hotspot moves are checked before they land.
 */
import { describe, expect, it } from 'vitest'
import { loadFarmLayout } from './farm-layout'
import { anchorsFromLayout } from './hotspot-anchors'
import { seededRngFactory } from './test-fixtures'
import type { TileCoord } from './tile-grid'
import { chunksCoveringGround, tilesOfChunk } from './tile-grid'
import type { WorldSpec } from './tile-world'
import { buildTileWorld, tileOf } from './tile-world'
import type { Tile, TileWorld } from './tile-world-types'
import {
  applyEdit,
  builtTileAt,
  eraseAt,
  hotspotAt,
  hotspotMoveProblem,
  isHotspotMoved,
  neighbouringChunks,
  overriddenLayersAt,
  removeEditsAt,
} from './world-editing'
import type { WorldEdit, WorldOverrides } from './world-overrides'
import { NO_OVERRIDES } from './world-overrides'

const SEED = 20261008
const anchors = anchorsFromLayout(loadFarmLayout())
const land = chunksCoveringGround(loadFarmLayout().ground.size)

function specWith(edits: readonly WorldEdit[] = []): WorldSpec {
  return { seed: SEED, anchors, overrides: { ...NO_OVERRIDES, edits }, rngFor: seededRngFactory }
}

function build(overrides: WorldOverrides): TileWorld {
  return buildTileWorld({ ...specWith(), overrides }, land)
}

const generated = build(NO_OVERRIDES)

/** The first generated tile matching `test`, scanning the land in order. */
function firstTile(test: (tile: Tile, at: TileCoord) => boolean): TileCoord {
  for (const chunk of generated.chunks) {
    const found = tilesOfChunk(chunk.coord).find((at, index) => test(chunk.tiles[index] as Tile, at))
    if (found) return found
  }
  throw new Error('no such tile in the generated farm')
}

const bareGrass = firstTile((tile, at) => tile.ground.kind === 'grass' && !tile.structure && !tile.decor && !hotspotAt(generated, at))
const decorated = firstTile((tile) => tile.decor !== undefined && !tile.structure)
const fenced = firstTile((tile) => tile.structure?.kind === 'fence')

describe('applyEdit', () => {
  it('records an edit that changes the tile', () => {
    const edit: WorldEdit = { op: 'set-ground', at: bareGrass, ground: 'dirt' }
    const overrides = applyEdit(specWith(), edit)
    expect(overrides.edits).toEqual([edit])
    expect(tileOf(build(overrides), bareGrass)?.ground.kind).toBe('dirt')
  })

  it('drops an edit that restores the generated value, removing the earlier override', () => {
    const painted = applyEdit(specWith(), { op: 'set-ground', at: bareGrass, ground: 'dirt' })
    const restored = applyEdit({ ...specWith(), overrides: painted }, { op: 'set-ground', at: bareGrass, ground: 'grass' })
    expect(restored.edits).toEqual([])
  })

  it('stores nothing for an edit the world already matches', () => {
    expect(applyEdit(specWith(), { op: 'set-ground', at: bareGrass, ground: 'grass' }).edits).toEqual([])
    expect(applyEdit(specWith(), { op: 'remove-decor', at: bareGrass }).edits).toEqual([])
  })

  it('replaces an earlier edit of the same layer on the same tile, keeping other layers', () => {
    const steps: WorldEdit[] = [
      { op: 'set-ground', at: bareGrass, ground: 'dirt' },
      { op: 'place-decor', at: bareGrass, kind: 'tree', rotation: 0 },
      { op: 'set-ground', at: bareGrass, ground: 'water' },
    ]
    const overrides = steps.reduce((current, edit) => applyEdit({ ...specWith(), overrides: current }, edit), NO_OVERRIDES)
    // Water clears decor anyway, so the tree edit beneath it is dropped too.
    expect(overrides.edits).toEqual([{ op: 'set-ground', at: bareGrass, ground: 'water' }])
  })

  it('keeps a decor edit when the ground painted over it keeps decor', () => {
    const tree: WorldEdit = { op: 'place-decor', at: bareGrass, kind: 'tree', rotation: 2 }
    const dirt: WorldEdit = { op: 'set-ground', at: bareGrass, ground: 'dirt' }
    const overrides = applyEdit({ ...specWith(), overrides: applyEdit(specWith(), tree) }, dirt)
    expect(overrides.edits).toEqual([tree, dirt])
  })

  it('leaves edits on other tiles alone', () => {
    const elsewhere: WorldEdit = { op: 'set-ground', at: { x: bareGrass.x + 1, z: bareGrass.z }, ground: 'dirt' }
    const overrides = applyEdit(specWith([elsewhere]), { op: 'place-decor', at: bareGrass, kind: 'rock', rotation: 0 })
    expect(overrides.edits).toHaveLength(2)
  })

  it('records a hotspot move, replaces an earlier one, and drops one back to the layout', () => {
    const farmhouse = anchors.find((anchor) => anchor.id === 'farmhouse')!
    const home = { x: farmhouse.footprint.x, z: farmhouse.footprint.z }
    const first = applyEdit(specWith(), { op: 'move-hotspot', hotspot: 'farmhouse', to: { x: home.x, z: home.z + 1 } })
    const second = applyEdit({ ...specWith(), overrides: first }, { op: 'move-hotspot', hotspot: 'farmhouse', to: { x: home.x - 1, z: home.z } })
    expect(second.edits).toEqual([{ op: 'move-hotspot', hotspot: 'farmhouse', to: { x: home.x - 1, z: home.z } }])
    expect(applyEdit({ ...specWith(), overrides: second }, { op: 'move-hotspot', hotspot: 'farmhouse', to: home }).edits).toEqual([])
  })

  it('records a move for a hotspot the spec has no anchor for', () => {
    const spec = { ...specWith(), anchors: anchors.filter((anchor) => anchor.id !== 'nest') }
    expect(applyEdit(spec, { op: 'move-hotspot', hotspot: 'nest', to: { x: 0, z: 0 } }).edits).toHaveLength(1)
  })
})

describe('eraseAt', () => {
  it('removes generated decor with a remove-decor override', () => {
    const overrides = eraseAt(specWith(), decorated)
    expect(overrides.edits).toEqual([{ op: 'remove-decor', at: decorated }])
    expect(tileOf(build(overrides), decorated)?.decor).toBeUndefined()
  })

  it('removes placed decor by dropping its override', () => {
    expect(eraseAt(specWith([{ op: 'place-decor', at: bareGrass, kind: 'crate', rotation: 1 }]), bareGrass).edits).toEqual([])
  })

  it('removes a structure when there is no decor on top of it', () => {
    const overrides = eraseAt(specWith(), fenced)
    expect(overrides.edits).toEqual([{ op: 'remove-structure', at: fenced }])
    expect(tileOf(build(overrides), fenced)?.structure).toBeUndefined()
  })

  it('takes decor before the structure under it', () => {
    const spec = specWith([
      { op: 'place-structure', at: bareGrass, kind: 'fence', rotation: 0 },
      { op: 'place-decor', at: bareGrass, kind: 'barrel', rotation: 0 },
    ])
    expect(eraseAt(spec, bareGrass).edits).toEqual([{ op: 'place-structure', at: bareGrass, kind: 'fence', rotation: 0 }])
  })

  it('reverts painted ground once nothing stands on the tile', () => {
    expect(eraseAt(specWith([{ op: 'set-ground', at: bareGrass, ground: 'path' }]), bareGrass).edits).toEqual([])
  })

  it('changes nothing on a bare generated tile', () => {
    expect(eraseAt(specWith(), bareGrass).edits).toEqual([])
  })
})

describe('removeEditsAt and overriddenLayersAt', () => {
  const edits: WorldEdit[] = [
    { op: 'set-ground', at: bareGrass, ground: 'dirt' },
    { op: 'remove-structure', at: bareGrass },
    { op: 'set-ground', at: { x: 0, z: 0 }, ground: 'dirt' },
    { op: 'move-hotspot', hotspot: 'barn', to: { x: 1, z: 1 } },
  ]
  const overrides = { ...NO_OVERRIDES, edits }

  it('says which layers of a tile an override decides', () => {
    expect(overriddenLayersAt(overrides, bareGrass)).toEqual({ ground: true, structure: true, decor: false })
    expect(overriddenLayersAt(overrides, { x: 5, z: 5 })).toEqual({ ground: false, structure: false, decor: false })
  })

  it('reverts one tile to generated and keeps everything else, hotspot moves included', () => {
    expect(removeEditsAt(overrides, bareGrass).edits).toEqual(edits.slice(2))
  })

  it('knows which hotspots have been moved', () => {
    expect(isHotspotMoved(overrides, 'barn')).toBe(true)
    expect(isHotspotMoved(overrides, 'nest')).toBe(false)
  })
})

describe('hotspots in the editor', () => {
  const barn = generated.hotspots.find((hotspot) => hotspot.id === 'barn')!
  const farmhouse = generated.hotspots.find((hotspot) => hotspot.id === 'farmhouse')!

  it('finds the hotspot whose footprint covers a tile', () => {
    expect(hotspotAt(generated, { x: barn.footprint.x, z: barn.footprint.z })?.id).toBe('barn')
    expect(hotspotAt(generated, bareGrass)).toBeUndefined()
  })

  it('allows a move to clear land', () => {
    expect(hotspotMoveProblem(generated, 'farmhouse', { x: farmhouse.footprint.x, z: farmhouse.footprint.z + 1 })).toBeNull()
  })

  it('refuses a move off the land', () => {
    expect(hotspotMoveProblem(generated, 'farmhouse', { x: 40, z: 0 })).toBe('farmhouse would leave the land')
  })

  it('refuses a move onto another hotspot or its arrival', () => {
    expect(hotspotMoveProblem(generated, 'farmhouse', { x: barn.footprint.x, z: barn.footprint.z })).toBe('farmhouse would overlap barn')
    const ontoArrival = { x: barn.arrival.x, z: barn.arrival.z - farmhouse.footprint.depth + 1 }
    expect(hotspotMoveProblem(generated, 'farmhouse', ontoArrival)).toMatch(/would overlap/)
  })

  it('refuses to move a hotspot the world does not have', () => {
    const withoutNest = { ...generated, hotspots: generated.hotspots.filter((hotspot) => hotspot.id !== 'nest') }
    expect(hotspotMoveProblem(withoutNest, 'nest', { x: 0, z: 0 })).toBe('nest is not on this farm')
  })

  it('re-routes the path to a moved hotspot’s new arrival', () => {
    const to = { x: farmhouse.footprint.x, z: farmhouse.footprint.z + 1 }
    const moved = build(applyEdit(specWith(), { op: 'move-hotspot', hotspot: 'farmhouse', to }))
    const arrival = moved.hotspots.find((hotspot) => hotspot.id === 'farmhouse')!.arrival
    expect(arrival).toEqual({ x: farmhouse.arrival.x, z: farmhouse.arrival.z + 1 })
    expect(tileOf(moved, arrival)?.ground.kind).toBe('path')
  })
})

describe('builtTileAt', () => {
  it('builds the same tile the whole world does', () => {
    expect(builtTileAt(specWith(), decorated)).toEqual(tileOf(generated, decorated))
  })
})

describe('neighbouringChunks', () => {
  it('offers each chunk beside the land once, in row order', () => {
    expect(neighbouringChunks([{ cx: 0, cz: 0 }])).toEqual([
      { cx: 0, cz: -1 },
      { cx: -1, cz: 0 },
      { cx: 1, cz: 0 },
      { cx: 0, cz: 1 },
    ])
  })

  it('offers the eight chunks round the starting square', () => {
    expect(neighbouringChunks(land)).toHaveLength(8)
  })
})
