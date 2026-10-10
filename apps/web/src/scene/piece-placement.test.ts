import type { Chunk, PlacedHotspot, Tile } from '@sf/world'
import { CHUNK_SIZE } from '@sf/world'
import { describe, expect, it } from 'vitest'
import type { PieceFit } from '../world-assets'
import { footprintCentre, groupPieces, hotspotMarkers, pieceTransform } from './piece-placement'

const fit = (overrides: Partial<PieceFit> = {}): PieceFit => ({
  rotationOffset: 0,
  scale: 1,
  yOffset: 0,
  modelOffset: { x: 0, z: 0 },
  footprint: { x: 1, z: 1 },
  ...overrides,
})

/** Where a model-space point lands, by the same order of operations three.js applies to the instance. */
function land(model: PieceFit, at: Parameters<typeof pieceTransform>[1], point: [number, number]): [number, number] {
  const { position, yaw, scale } = pieceTransform(model, at)
  const [px, pz] = [point[0] * scale, point[1] * scale]
  return [position[0] + px * Math.cos(yaw) + pz * Math.sin(yaw), position[2] - px * Math.sin(yaw) + pz * Math.cos(yaw)]
}

describe('pieceTransform', () => {
  it('stands an unturned piece on its point, at its catalogue height and scale', () => {
    expect(pieceTransform(fit({ yOffset: -0.2, scale: 2 }), { x: 3.5, z: -1.5, rotation: 0 })).toEqual({
      position: [3.5, -0.2, -1.5],
      yaw: 0,
      scale: 2,
    })
  })

  it('turns clockwise from above: one turn carries the model\'s north (−Z) to east (+X)', () => {
    const [x, z] = land(fit(), { x: 0, z: 0, rotation: 1 }, [0, -1])
    expect(x).toBeCloseTo(1, 12)
    expect(z).toBeCloseTo(0, 12)
  })

  it('adds the catalogue turn to the world turn', () => {
    const turned = pieceTransform(fit({ rotationOffset: Math.PI }), { x: 0, z: 0, rotation: 1 })
    expect(turned.yaw).toBeCloseTo(1.5 * Math.PI + Math.PI, 12)
  })

  it('turns the model offset with the model, so an off-centre model stays on its tile at every turn', () => {
    // A model whose geometry sits 0.4 east of its pivot, pulled back onto the pivot by its offset.
    const offCentre = fit({ modelOffset: { x: -0.4, z: 0 } })
    for (const rotation of [0, 1, 2, 3] as const) {
      const [x, z] = land(offCentre, { x: 5.5, z: 2.5, rotation }, [0.4, 0])
      expect(x).toBeCloseTo(5.5, 12)
      expect(z).toBeCloseTo(2.5, 12)
    }
  })
})

const GRASS: Tile = { ground: { kind: 'grass' } }

function chunkWith(cx: number, cz: number, placed: Record<number, Tile>): Chunk {
  return { coord: { cx, cz }, tiles: Array.from({ length: CHUNK_SIZE * CHUNK_SIZE }, (_, index) => placed[index] ?? GRASS) }
}

describe('groupPieces', () => {
  it('groups every structure and decor piece by PieceId across chunks, at tile centres, keeping each turn', () => {
    const west = chunkWith(-1, 0, {
      0: { ground: { kind: 'grass' }, structure: { kind: 'fence', role: 'straight', rotation: 1 } },
      17: { ground: { kind: 'dirt' }, decor: { kind: 'tree', rotation: 2 } },
    })
    const east = chunkWith(0, 0, { 3: { ground: { kind: 'grass' }, structure: { kind: 'fence', role: 'straight', rotation: 0 } } })

    const groups = groupPieces([west, east])

    expect(groups).toEqual([
      {
        pieceId: 'fence:straight',
        placements: [
          { x: -15.5, z: 0.5, rotation: 1 },
          { x: 3.5, z: 0.5, rotation: 0 },
        ],
      },
      { pieceId: 'tree', placements: [{ x: -14.5, z: 1.5, rotation: 2 }] },
    ])
  })

  it('draws no ground pieces: ground is the surface, even where the tile is a path', () => {
    const paths = chunkWith(0, 0, { 0: { ground: { kind: 'path', role: 'cross', rotation: 0 } }, 1: { ground: { kind: 'water' } } })
    expect(groupPieces([paths])).toEqual([])
  })

  it('gives an empty world nothing to draw', () => {
    expect(groupPieces([])).toEqual([])
  })
})

const hotspot = (overrides: Partial<PlacedHotspot>): PlacedHotspot => ({
  id: 'nest',
  style: 'open',
  footprint: { x: 0, z: 0, width: 1, depth: 1 },
  entranceSide: 'south',
  entrance: { x: 0, z: 0 },
  arrival: { x: 0, z: 1 },
  rotation: 2,
  ...overrides,
})

describe('footprintCentre', () => {
  it('is the middle of the rect in world units, on a tile edge when the side is even', () => {
    expect(footprintCentre({ x: -7, z: 3, width: 4, depth: 3 })).toEqual({ x: -5, z: 4.5 })
  })
})

describe('hotspotMarkers', () => {
  it('stands each open hotspot\'s marker mid-footprint, facing out through its entrance', () => {
    const markers = hotspotMarkers([
      hotspot({ id: 'nest', footprint: { x: -8, z: -7, width: 3, depth: 3 }, rotation: 2 }),
      hotspot({ id: 'petting-zoo', footprint: { x: -12, z: -2, width: 4, depth: 4 }, rotation: 1 }),
    ])
    expect(markers).toEqual([
      { pieceId: 'hotspot:nest', placements: [{ x: -6.5, z: -5.5, rotation: 2 }] },
      { pieceId: 'hotspot:petting-zoo', placements: [{ x: -10, z: 0, rotation: 1 }] },
    ])
  })

  it('leaves fenced and building footprints to the gate or door the world built on them', () => {
    const markers = hotspotMarkers([
      hotspot({ id: 'paddock', style: 'fenced' }),
      hotspot({ id: 'barn', style: 'building' }),
      hotspot({ id: 'nest', style: 'open' }),
    ])
    expect(markers.map((marker) => marker.pieceId)).toEqual(['hotspot:nest'])
  })
})
