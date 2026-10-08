import { describe, expect, it } from 'vitest'
import { ANIMAL_SPECIES } from './piece-kinds'
import { KENNEY_ANIMALS, KENNEY_CATALOGUE, type PieceModel } from './kenney-catalogue'
import type { Vec3 } from './piece-fit'
import { readVertices } from './test/served-models'

/**
 * Checks "rotation 0" against the real geometry: each model's vertices are put
 * through the catalogue's scale, offset and rotation (three.js's
 * counter-clockwise sense about +Y) exactly as `PlacedPiece` does, then the
 * test looks at which tile edges they reach. North is −Z, east is +X.
 */
function placed(model: PieceModel): Vec3[] {
  const cos = Math.cos(model.rotationOffset)
  const sin = Math.sin(model.rotationOffset)
  return readVertices(model.url).map(([x, y, z]) => {
    const px = x * model.scale + model.modelOffset.x
    const pz = z * model.scale + model.modelOffset.z
    return [px * cos + pz * sin, y * model.scale + model.yOffset, -px * sin + pz * cos]
  })
}

const EDGE = 0.47
const reaches = (vertices: Vec3[]) => ({
  north: vertices.some(([, , z]) => z < -EDGE),
  south: vertices.some(([, , z]) => z > EDGE),
  east: vertices.some(([x]) => x > EDGE),
  west: vertices.some(([x]) => x < -EDGE),
})
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

describe('catalogue orientation at rotation 0', () => {
  it.each(['fence:straight', 'fence-gate'] as const)('%s runs north–south down the tile centre', (id) => {
    const vertices = placed(KENNEY_CATALOGUE[id])
    expect(reaches(vertices)).toEqual({ north: true, south: true, east: false, west: false })
    for (const [x] of vertices) expect(Math.abs(x)).toBeLessThan(0.05)
  })

  it('fence:corner meets the centre lines of its north and east neighbours, where the straights run', () => {
    // Fantasy Town's arc is an edge fence 0.46 off the centre line; shifted
    // onto the centre lines its ends overlap the neighbouring straights, so a
    // pen corner joins instead of leaving a gap.
    const vertices = placed(KENNEY_CATALOGUE['fence:corner'])
    const northmost = Math.min(...vertices.map(([, , z]) => z))
    const eastmost = Math.max(...vertices.map(([x]) => x))
    const northEnd = vertices.filter(([, , z]) => z < northmost + 0.02)
    const eastEnd = vertices.filter(([x]) => x > eastmost - 0.02)
    expect(Math.abs(mean(northEnd.map(([x]) => x)))).toBeLessThan(0.01)
    expect(Math.abs(mean(eastEnd.map(([, , z]) => z)))).toBeLessThan(0.01)
    // The arc bows towards the south-west, so the pen's inside is north-east.
    expect(mean(vertices.map(([x]) => x))).toBeGreaterThan(0)
    expect(mean(vertices.map(([, , z]) => z))).toBeLessThan(0)
  })

  it.each(['building-wall', 'building-wall-door', 'building-wall-window', 'hotspot:barn'] as const)(
    '%s stands on the north edge, running east–west',
    (id) => {
      const vertices = placed(KENNEY_CATALOGUE[id])
      for (const [, , z] of vertices) expect(z).toBeLessThan(-0.39)
      expect(reaches(vertices)).toMatchObject({ east: true, west: true })
    },
  )

  it.each(ANIMAL_SPECIES)('the %s faces north: its head is on the −Z side', (species) => {
    const vertices = placed(KENNEY_ANIMALS[species])
    const top = Math.max(...vertices.map(([, y]) => y))
    const head = vertices.filter(([, y]) => y > 0.75 * top)
    expect(mean(head.map(([, , z]) => z))).toBeLessThan(0)
  })
})
