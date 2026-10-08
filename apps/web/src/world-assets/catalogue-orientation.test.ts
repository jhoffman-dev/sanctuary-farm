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

  it('fence:corner hugs the south and west edges, so its ends head north and east', () => {
    // An edge-fence arc from Fantasy Town: it joins north and east, but 0.46
    // off the centre line — which is why the entry is a placeholder.
    const vertices = placed(KENNEY_CATALOGUE['fence:corner'])
    expect(mean(vertices.map(([x]) => x))).toBeLessThan(0)
    expect(mean(vertices.map(([, , z]) => z))).toBeGreaterThan(0)
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
