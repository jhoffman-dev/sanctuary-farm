/**
 * Rebuilding after an edit: the result is always exactly what a full build
 * would give, and every chunk the edit cannot reach is the same object as
 * before, so a renderer keyed on chunk identity redraws only what changed.
 */
import { describe, expect, it } from 'vitest'
import { loadFarmLayout } from './farm-layout'
import { anchorsFromLayout } from './hotspot-anchors'
import { seededRngFactory } from './test-fixtures'
import type { ChunkCoord, TileCoord } from './tile-grid'
import { CHUNK_SIZE, chunkOf, sameChunk } from './tile-grid'
import type { WorldSpec } from './tile-world'
import { buildTileWorld, rebuildTileWorld } from './tile-world'
import type { TileWorld } from './tile-world-types'
import type { WorldEdit } from './world-overrides'
import { NO_OVERRIDES } from './world-overrides'

const anchors = anchorsFromLayout(loadFarmLayout())
/** Three by two, so some chunks are neither the edited one nor beside it. */
const LAND: ChunkCoord[] = [-1, 0, 1].flatMap((cx) => [-1, 0].map((cz) => ({ cx, cz })))
const SEED = 20261008

function specWith(edits: readonly WorldEdit[], seed = SEED): WorldSpec {
  return { seed, anchors, overrides: { ...NO_OVERRIDES, edits }, rngFor: seededRngFactory }
}

function after(previous: readonly WorldEdit[], next: readonly WorldEdit[], chunks = LAND, nextSeed = SEED) {
  const previousSpec = specWith(previous)
  const before = buildTileWorld(previousSpec, LAND)
  const spec = specWith(next, nextSeed)
  return { before, rebuilt: rebuildTileWorld({ world: before, spec: previousSpec }, spec, chunks), full: buildTileWorld(spec, chunks) }
}

function chunkAt(world: TileWorld, coord: ChunkCoord) {
  return world.chunks.find((chunk) => sameChunk(chunk.coord, coord))
}

/** The chunks whose objects were kept from `before`. */
function kept(before: TileWorld, rebuilt: TileWorld): ChunkCoord[] {
  return rebuilt.chunks.filter((chunk) => chunk === chunkAt(before, chunk.coord)).map((chunk) => chunk.coord)
}

const local = (chunk: ChunkCoord, x: number, z: number): TileCoord => ({ x: chunk.cx * CHUNK_SIZE + x, z: chunk.cz * CHUNK_SIZE + z })
const middle = { cx: 0, cz: -1 }

describe('rebuildTileWorld', () => {
  it('rebuilds only the chunk of an edit away from its edges', () => {
    const at = local(middle, 7, 7)
    const { before, rebuilt, full } = after([], [{ op: 'set-ground', at, ground: 'path' }])
    expect(rebuilt).toEqual(full)
    expect(kept(before, rebuilt)).toEqual(LAND.filter((coord) => !sameChunk(coord, middle)).sort((a, b) => a.cz - b.cz || a.cx - b.cx))
    expect(rebuilt.hotspots).toBe(before.hotspots)
  })

  it('also rebuilds the chunk across the edge an edge tile autotiles against', () => {
    const east = { cx: middle.cx + 1, cz: middle.cz }
    // A fence just across the border: the new one beside it changes how it joins.
    const across: WorldEdit = { op: 'place-structure', at: local(east, 0, 5), kind: 'fence', rotation: 0 }
    const at = local(middle, CHUNK_SIZE - 1, 5)
    const { before, rebuilt, full } = after([across], [across, { op: 'place-structure', at, kind: 'fence', rotation: 0 }])
    expect(rebuilt).toEqual(full)
    const rebuiltCoords = rebuilt.chunks.filter((chunk) => chunk !== chunkAt(before, chunk.coord)).map((chunk) => chunk.coord)
    expect(rebuiltCoords).toEqual(expect.arrayContaining([middle, east]))
    expect(rebuiltCoords).toHaveLength(2)
  })

  it('treats an undone edit like any other change, and an unchanged spec as no change at all', () => {
    const edit: WorldEdit = { op: 'remove-decor', at: local(middle, 3, 3) }
    const undone = after([edit], [])
    expect(undone.rebuilt).toEqual(undone.full)
    expect(chunkAt(undone.rebuilt, chunkOf(edit.at))).not.toBe(chunkAt(undone.before, chunkOf(edit.at)))
    const same = after([edit], [edit])
    expect(same.rebuilt.chunks.every((chunk, index) => chunk === same.before.chunks[index])).toBe(true)
  })

  it('sees an edit reordered on one tile, since the later edit wins', () => {
    const at = local(middle, 4, 4)
    const dirt: WorldEdit = { op: 'set-ground', at, ground: 'dirt' }
    const water: WorldEdit = { op: 'set-ground', at, ground: 'water' }
    const { rebuilt, full } = after([dirt, water], [water, dirt])
    expect(rebuilt).toEqual(full)
  })

  it('rebuilds everything when a hotspot moves or the seed changes', () => {
    const moved = after([], [{ op: 'move-hotspot', hotspot: 'nest', to: { x: -12, z: -12 } }])
    expect(moved.rebuilt).toEqual(moved.full)
    expect(kept(moved.before, moved.rebuilt)).toEqual([])
    const reseeded = after([], [], LAND, SEED + 1)
    expect(reseeded.rebuilt).toEqual(reseeded.full)
    expect(kept(reseeded.before, reseeded.rebuilt)).toEqual([])
  })

  it('matches a full build after every step of a long seeded run of edits along chunk borders', () => {
    const rng = seededRngFactory(7)
    const pick = <T,>(items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T
    // Biased to chunk edges and corners, where neighbouring chunks autotile against each other.
    const offsets = [0, CHUNK_SIZE - 1]
    const makers: ((at: TileCoord) => WorldEdit)[] = [
      (at) => ({ op: 'set-ground', at, ground: pick(['path', 'dirt', 'water', 'grass'] as const) }),
      (at) => ({ op: 'place-structure', at, kind: 'fence', rotation: 0 }),
      (at) => ({ op: 'remove-structure', at }),
      (at) => ({ op: 'place-decor', at, kind: 'rock', rotation: 0 }),
    ]
    let edits: WorldEdit[] = []
    let world = buildTileWorld(specWith(edits), LAND)
    for (let step = 0; step < 60; step += 1) {
      const at = local(pick(LAND), pick(offsets), pick([4, 5]))
      const next = rng() < 0.2 && edits.length > 0 ? edits.slice(0, -1) : [...edits, pick(makers)(at)]
      world = rebuildTileWorld({ world, spec: specWith(edits) }, specWith(next), LAND)
      edits = next
      expect(world, `step ${step}`).toEqual(buildTileWorld(specWith(edits), LAND))
    }
  })

  it('builds new land, drops land that is gone, and keeps the rest', () => {
    const grown = [...LAND, { cx: 2, cz: 0 }]
    const added = after([], [], grown)
    expect(added.rebuilt).toEqual(added.full)
    expect(kept(added.before, added.rebuilt)).toHaveLength(LAND.length)
    const shrunk = after([], [], LAND.slice(1))
    expect(shrunk.rebuilt).toEqual(shrunk.full)
    expect(kept(shrunk.before, shrunk.rebuilt)).toHaveLength(LAND.length - 1)
  })
})
