/**
 * The tile world's promises (issue #118): deterministic from seed + overrides,
 * every hotspot reachable along paths, fenced pens with one gate on the path,
 * decor out of the way, overrides that win and survive, and land that can be
 * added without touching land already built.
 */
import { describe, expect, it } from 'vitest'
import { loadFarmLayout } from './farm-layout'
import type { HotspotAnchor } from './hotspot-anchors'
import { anchorsFromLayout } from './hotspot-anchors'
import { parseWorldOverrides } from './parse-world-overrides'
import { seededRngFactory } from './test-fixtures'
import type { ChunkCoord, TileCoord } from './tile-grid'
import { CHUNK_SIZE, DIRECTIONS, chunksCoveringGround, distanceToRect, neighbour, rectContains, tileKey, tilesOfChunk } from './tile-grid'
import { DECOR_KINDS, GROUND_KINDS, PIECE_IDS, STRUCTURE_KINDS, pieceIdOf } from './tile-kinds'
import { addChunk, buildTileWorld, tileOf } from './tile-world'
import type { WorldSpec } from './tile-world'
import type { Tile, TileWorld } from './tile-world-types'
import type { WorldEdit, WorldOverrides } from './world-overrides'
import { NO_OVERRIDES } from './world-overrides'
import { HOTSPOT_IDS } from './world-layout'

const layout = loadFarmLayout()
const anchors = anchorsFromLayout(layout)
const farmChunks = chunksCoveringGround(layout.ground.size)
const SEEDS = Array.from({ length: 12 }, (_, at) => at * 7919 + 1)

function specWith(seed: number, edits: readonly WorldEdit[] = []): WorldSpec {
  const overrides: WorldOverrides = { ...NO_OVERRIDES, edits }
  return { seed, anchors, overrides, rngFor: seededRngFactory }
}

function farm(seed: number, edits: readonly WorldEdit[] = []): TileWorld {
  return buildTileWorld(specWith(seed, edits), farmChunks)
}

function everyTile(world: TileWorld): { at: TileCoord; tile: Tile }[] {
  return world.chunks.flatMap((chunk) => tilesOfChunk(chunk.coord).map((at, index) => ({ at, tile: chunk.tiles[index] as Tile })))
}

function must(world: TileWorld, at: TileCoord): Tile {
  const tile = tileOf(world, at)
  if (tile === undefined) throw new Error(`no tile at ${tileKey(at)}`)
  return tile
}

/** Every path tile reachable from `start` by stepping between edge-adjacent path tiles. */
function pathReach(world: TileWorld, start: TileCoord): Set<string> {
  const reached = new Set([tileKey(start)])
  const queue = [start]
  for (let at = queue.shift(); at !== undefined; at = queue.shift()) {
    for (const next of DIRECTIONS.map((side) => neighbour(at as TileCoord, side))) {
      if (reached.has(tileKey(next)) || tileOf(world, next)?.ground.kind !== 'path') continue
      reached.add(tileKey(next))
      queue.push(next)
    }
  }
  return reached
}

function borderTiles(anchor: HotspotAnchor): TileCoord[] {
  const { x, z, width, depth } = anchor.footprint
  return Array.from({ length: width * depth }, (_, at) => ({ x: x + (at % width), z: z + Math.floor(at / width) })).filter(
    (tile) => tile.x === x || tile.z === z || tile.x === x + width - 1 || tile.z === z + depth - 1,
  )
}

const anchorOf = (id: string): HotspotAnchor => anchors.find((anchor) => anchor.id === id) as HotspotAnchor

describe('determinism', () => {
  it('builds the same world from the same seed and overrides, every time', () => {
    const edits: WorldEdit[] = [{ op: 'place-decor', at: { x: 3, z: 3 }, kind: 'rock', rotation: 1 }]
    expect(farm(42, edits)).toStrictEqual(farm(42, edits))
  })

  it('survives a JSON round trip unchanged', () => {
    const world = farm(42)
    expect(JSON.parse(JSON.stringify(world))).toStrictEqual(world)
  })

  it('builds a different world from a different seed', () => {
    expect(farm(1)).not.toEqual(farm(2))
  })

  it('builds a chunk the same alone as in the whole world', () => {
    const whole = farm(9)
    const alone = buildTileWorld(specWith(9), [{ cx: 0, cz: -1 }])
    expect(alone.chunks[0]).toStrictEqual(whole.chunks.find(({ coord }) => coord.cx === 0 && coord.cz === -1))
  })
})

describe('paths', () => {
  it.each(SEEDS)('connects every hotspot to every other along path tiles (seed %i)', (seed) => {
    const world = farm(seed)
    const [first, ...rest] = world.hotspots
    const reached = pathReach(world, first!.arrival)
    for (const hotspot of [first!, ...rest]) {
      expect(must(world, hotspot.arrival).ground.kind, `${hotspot.id} arrival`).toBe('path')
      expect(reached.has(tileKey(hotspot.arrival)), `${hotspot.id} reachable`).toBe(true)
    }
  })

  it('never routes a path through a hotspot footprint when there is a way round', () => {
    for (const seed of SEEDS) {
      for (const { at, tile } of everyTile(farm(seed))) {
        if (tile.ground.kind !== 'path') continue
        expect(anchors.some((anchor) => rectContains(anchor.footprint, at)), tileKey(at)).toBe(false)
      }
    }
  })

  it('gives each path tile the piece its neighbours call for', () => {
    const world = farm(5)
    for (const { at, tile } of everyTile(world)) {
      if (tile.ground.kind !== 'path') continue
      const linked = DIRECTIONS.filter((side) => tileOf(world, neighbour(at, side))?.ground.kind === 'path').length
      // Tiles on the world's rim may link to land not built yet, so only interior tiles are checked.
      if (DIRECTIONS.some((side) => tileOf(world, neighbour(at, side)) === undefined)) continue
      const expected = { 0: ['end'], 1: ['end'], 2: ['straight', 'corner'], 3: ['tee'], 4: ['cross'] }[linked]
      expect(expected).toContain(tile.ground.role)
    }
  })
})

describe('fenced pens', () => {
  it.each(['paddock', 'training-ring'])('encloses the %s with fences and exactly one gate, next to a path', (id) => {
    for (const seed of SEEDS.slice(0, 4)) {
      const world = farm(seed)
      const anchor = anchorOf(id)
      const border = borderTiles(anchor).map((at) => ({ at, structure: must(world, at).structure }))
      for (const { structure } of border) {
        expect(['fence', 'fence-gate']).toContain(structure?.kind)
        expect(structure?.enclosure).toBe(id)
      }
      const gates = border.filter(({ structure }) => structure?.kind === 'fence-gate')
      expect(gates).toHaveLength(1)
      const gate = gates[0]!.at
      const besideGate = DIRECTIONS.map((side) => tileOf(world, neighbour(gate, side))?.ground.kind)
      expect(besideGate).toContain('path')
    }
  })

  it('turns the fence at the corners and runs it straight along the sides', () => {
    const world = farm(3)
    const { x, z, width } = anchorOf('paddock').footprint
    expect(must(world, { x, z }).structure).toMatchObject({ kind: 'fence', role: 'corner', rotation: 1 })
    expect(must(world, { x: x + width - 1, z }).structure).toMatchObject({ kind: 'fence', role: 'corner', rotation: 2 })
    expect(must(world, { x: x + 2, z }).structure).toMatchObject({ kind: 'fence', role: 'straight', rotation: 1 })
    expect(must(world, { x, z: z + 2 }).structure).toMatchObject({ kind: 'fence', role: 'straight', rotation: 0 })
  })

  it('keeps two pens built side by side as two pens', () => {
    const paddock = anchorOf('paddock').footprint
    const ring = anchorOf('training-ring').footprint
    // Shifted south of the paddock's gate, so neither pen's arrival is built over.
    const beside = { x: paddock.x - ring.width, z: paddock.z + 5 }
    const world = farm(3, [{ op: 'move-hotspot', hotspot: 'training-ring', to: beside }])
    const sharedEdge = { x: paddock.x, z: paddock.z + 7 }
    expect(must(world, sharedEdge).structure).toMatchObject({ role: 'straight', enclosure: 'paddock' })
    expect(must(world, { ...sharedEdge, x: sharedEdge.x - 1 }).structure).toMatchObject({ role: 'straight', enclosure: 'training-ring' })
  })

  it('puts placeholder walls, a door facing the arrival and a roof on each building', () => {
    const world = farm(3)
    const barn = anchorOf('barn')
    expect(must(world, barn.entrance).structure).toEqual({ kind: 'building-wall-door', rotation: 2 })
    const inside = { x: barn.footprint.x + 1, z: barn.footprint.z + 1 }
    expect(must(world, inside).structure?.kind).toBe('building-roof')
    for (const at of borderTiles(barn)) expect(must(world, at).structure?.kind).toMatch(/^building-wall/)
  })
})

describe('decor', () => {
  it('never lands on a path, gate, door, structure or hotspot footprint, nor beside a path', () => {
    for (const seed of SEEDS) {
      const world = farm(seed)
      for (const { at, tile } of everyTile(world)) {
        if (tile.decor === undefined) continue
        expect(tile.ground.kind, tileKey(at)).toBe('grass')
        expect(tile.structure).toBeUndefined()
        expect(anchors.some((anchor) => rectContains(anchor.footprint, at))).toBe(false)
        for (const side of DIRECTIONS) expect(tileOf(world, neighbour(at, side))?.ground.kind).not.toBe('path')
      }
    }
  })

  it('keeps two tiles clear around every entrance and arrival', () => {
    for (const seed of SEEDS) {
      for (const { at, tile } of everyTile(farm(seed))) {
        if (tile.decor === undefined) continue
        for (const anchor of anchors) {
          for (const spot of [anchor.entrance, anchor.arrival]) {
            expect(distanceToRect({ ...spot, width: 1, depth: 1 }, at), `${tileKey(at)} by ${anchor.id}`).toBeGreaterThan(2)
          }
        }
      }
    }
  })

  it('grows crops only by the farmhouse and trees only away from the buildings', () => {
    const farmhouse = anchorOf('farmhouse').footprint
    const buildings = ['barn', 'feed-shed', 'farmhouse'].map((id) => anchorOf(id).footprint)
    let crops = 0
    for (const seed of SEEDS) {
      for (const { at, tile } of everyTile(farm(seed))) {
        if (tile.decor?.kind === 'crop') {
          crops += 1
          expect(distanceToRect(farmhouse, at)).toBeLessThanOrEqual(3)
        }
        if (tile.decor?.kind.startsWith('tree')) for (const rect of buildings) expect(distanceToRect(rect, at)).toBeGreaterThan(2)
      }
    }
    expect(crops).toBeGreaterThan(0)
  })

  it('scatters decor at all — the farm is not bare', () => {
    const decorated = everyTile(farm(11)).filter(({ tile }) => tile.decor !== undefined)
    expect(decorated.length).toBeGreaterThan(20)
  })
})

describe('ponds', () => {
  it('keeps generated water away from every footprint and arrival', () => {
    let water = 0
    for (const seed of SEEDS) {
      for (const { at, tile } of everyTile(farm(seed))) {
        if (tile.ground.kind !== 'water') continue
        water += 1
        for (const anchor of anchors) {
          expect(distanceToRect(anchor.footprint, at)).toBeGreaterThan(2)
          expect(distanceToRect({ ...anchor.arrival, width: 1, depth: 1 }, at)).toBeGreaterThan(2)
        }
      }
    }
    expect(water).toBeGreaterThan(0)
  })
})

describe('the kind vocabulary', () => {
  it.each(SEEDS.slice(0, 4))('uses only exported kinds and piece ids (seed %i)', (seed) => {
    const world = farm(seed)
    for (const { tile } of everyTile(world)) {
      expect(GROUND_KINDS).toContain(tile.ground.kind)
      expect(PIECE_IDS).toContain(pieceIdOf(tile.ground))
      if (tile.structure !== undefined) {
        expect(STRUCTURE_KINDS).toContain(tile.structure.kind)
        expect(PIECE_IDS).toContain(pieceIdOf(tile.structure))
      }
      if (tile.decor !== undefined) {
        expect(DECOR_KINDS).toContain(tile.decor.kind)
        expect(PIECE_IDS).toContain(pieceIdOf(tile.decor))
      }
    }
    for (const hotspot of world.hotspots) expect(PIECE_IDS).toContain(`hotspot:${hotspot.id}`)
    expect(world.hotspots.map(({ id }) => id)).toEqual([...HOTSPOT_IDS])
  })

  it('lists every piece id once', () => {
    expect(new Set(PIECE_IDS).size).toBe(PIECE_IDS.length)
  })
})

describe('authored overrides', () => {
  const pathTile = (world: TileWorld): TileCoord => everyTile(world).find(({ tile }) => tile.ground.kind === 'path')!.at
  const grassTile = (world: TileWorld): TileCoord =>
    everyTile(world).find(({ at, tile }) => tile.ground.kind === 'grass' && tile.decor === undefined && at.x > 0)!.at

  it('win over generated tiles', () => {
    const plain = farm(4)
    const onPath = pathTile(plain)
    const onGrass = grassTile(plain)
    const gate = anchorOf('paddock').entrance
    const world = farm(4, [
      { op: 'set-ground', at: onPath, ground: 'water' },
      { op: 'place-decor', at: onGrass, kind: 'tree-tall', rotation: 2 },
      { op: 'remove-structure', at: gate },
    ])
    expect(must(world, onPath).ground).toEqual({ kind: 'water' })
    expect(must(world, onGrass).decor).toEqual({ kind: 'tree-tall', rotation: 2 })
    expect(must(world, gate).structure).toBeUndefined()
  })

  it('apply in file order, the later edit winning', () => {
    const at = grassTile(farm(4))
    const world = farm(4, [
      { op: 'place-decor', at, kind: 'rock', rotation: 0 },
      { op: 'remove-decor', at },
      { op: 'place-structure', at, kind: 'building-wall', rotation: 3 },
      { op: 'set-ground', at, ground: 'path' },
    ])
    expect(must(world, at)).toEqual({ ground: expect.objectContaining({ kind: 'path' }), structure: { kind: 'building-wall', rotation: 3 } })
  })

  it('clear decor from a tile painted as path or water', () => {
    const plain = farm(11)
    const decorated = everyTile(plain).find(({ tile }) => tile.decor !== undefined)!.at
    expect(must(farm(11, [{ op: 'set-ground', at: decorated, ground: 'water' }]), decorated).decor).toBeUndefined()
    expect(must(farm(11, [{ op: 'set-ground', at: decorated, ground: 'dirt' }]), decorated).decor).toBeDefined()
  })

  it('re-autotile their neighbours: a painted path joins the network', () => {
    const plain = farm(6)
    const isGrass = (at: TileCoord) => tileOf(plain, at)?.ground.kind === 'grass'
    const end = everyTile(plain).find(({ at, tile }) => {
      const east = neighbour(at, 'east')
      return tile.ground.kind === 'path' && isGrass(east) && (['north', 'east', 'south'] as const).every((side) => isGrass(neighbour(east, side)))
    })!.at
    const world = farm(6, [{ op: 'set-ground', at: neighbour(end, 'east'), ground: 'path' }])
    const before = must(plain, end).ground
    const after = must(world, end).ground
    expect(after).not.toEqual(before)
    expect(must(world, neighbour(end, 'east')).ground).toMatchObject({ kind: 'path', role: 'end', rotation: 3 })
  })

  it('autotile authored fences with each other', () => {
    const at = { x: -14, z: -14 }
    const world = farm(6, [
      { op: 'place-structure', at, kind: 'fence', rotation: 0 },
      { op: 'place-structure', at: neighbour(at, 'east'), kind: 'fence', rotation: 0 },
    ])
    expect(must(world, at).structure).toEqual({ kind: 'fence', role: 'end', rotation: 1 })
    expect(must(world, neighbour(at, 'east')).structure).toEqual({ kind: 'fence', role: 'end', rotation: 3 })
  })

  it.each(SEEDS.slice(0, 4))('survive regeneration with a new seed (seed %i)', (seed) => {
    const at = { x: -12, z: -12 }
    const edits: WorldEdit[] = [
      { op: 'set-ground', at, ground: 'dirt' },
      { op: 'place-decor', at, kind: 'barrel', rotation: 1 },
    ]
    expect(must(farm(seed, edits), at)).toEqual({ ground: { kind: 'dirt' }, decor: { kind: 'barrel', rotation: 1 } })
  })

  it('build the same world after a round trip through the overrides file', () => {
    const overrides: WorldOverrides = {
      schemaVersion: 1,
      edits: [
        { op: 'set-ground', at: { x: 2, z: 2 }, ground: 'water' },
        { op: 'move-hotspot', hotspot: 'nest', to: { x: -12, z: -12 } },
      ],
    }
    const parsed = parseWorldOverrides(JSON.parse(JSON.stringify(overrides)))
    if (!parsed.ok) throw new Error(parsed.reason)
    const spec = { ...specWith(8), overrides }
    expect(buildTileWorld({ ...spec, overrides: parsed.overrides }, farmChunks)).toStrictEqual(buildTileWorld(spec, farmChunks))
  })

  it('move a hotspot: its footprint, entrance and path all follow', () => {
    const to = { x: -13, z: -13 }
    const world = farm(2, [{ op: 'move-hotspot', hotspot: 'barn', to }])
    const barn = world.hotspots.find(({ id }) => id === 'barn')!
    expect(barn.footprint).toMatchObject(to)
    expect(must(world, barn.entrance).structure?.kind).toBe('building-wall-door')
    const reached = pathReach(world, barn.arrival)
    for (const hotspot of world.hotspots) expect(reached.has(tileKey(hotspot.arrival)), hotspot.id).toBe(true)
    const oldRoof = { x: anchorOf('barn').footprint.x + 1, z: anchorOf('barn').footprint.z + 1 }
    expect(must(world, oldRoof).structure).toBeUndefined()
  })
})

describe('expansion', () => {
  const newLand: ChunkCoord[] = [
    { cx: 1, cz: 0 },
    { cx: -2, cz: -1 },
    { cx: 0, cz: 1 },
  ]

  it.each(SEEDS.slice(0, 4))('adding chunks leaves every existing tile unchanged (seed %i)', (seed) => {
    const edits: WorldEdit[] = [{ op: 'set-ground', at: { x: 17, z: 3 }, ground: 'path' }]
    const before = buildTileWorld(specWith(seed, edits), farmChunks)
    const after = buildTileWorld(specWith(seed, edits), [...farmChunks, ...newLand])
    for (const chunk of before.chunks) {
      expect(after.chunks.find(({ coord }) => coord.cx === chunk.coord.cx && coord.cz === chunk.coord.cz)).toStrictEqual(chunk)
    }
  })

  it('addChunk builds the same chunk a full rebuild would, and ignores land already there', () => {
    const spec = specWith(13)
    const grown = addChunk(buildTileWorld(spec, farmChunks), spec, { cx: 1, cz: 0 })
    expect(grown).toStrictEqual(buildTileWorld(spec, [...farmChunks, { cx: 1, cz: 0 }]))
    expect(addChunk(grown, spec, { cx: 1, cz: 0 })).toBe(grown)
  })

  it('continues paths across the edge into the new land', () => {
    for (const seed of SEEDS.slice(0, 4)) {
      const world = buildTileWorld(specWith(seed), [...farmChunks, { cx: 1, cz: 0 }])
      const stubs = Array.from({ length: CHUNK_SIZE }, (_, z) => ({ x: CHUNK_SIZE - 1, z })).filter(
        (at) => must(world, at).ground.kind === 'path' && must(world, neighbour(at, 'east')).ground.kind === 'path',
      )
      expect(stubs.length).toBeGreaterThan(0)
      const reached = pathReach(world, world.hotspots[0]!.arrival)
      const newChunkPaths = everyTile(world).filter(({ at, tile }) => at.x >= CHUNK_SIZE && tile.ground.kind === 'path')
      expect(newChunkPaths.some(({ at }) => reached.has(tileKey(at)))).toBe(true)
    }
  })

  it('reads absent land: a tile off the world is undefined', () => {
    expect(tileOf(farm(1), { x: 100, z: 0 })).toBeUndefined()
  })
})
