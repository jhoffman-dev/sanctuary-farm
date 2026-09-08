/**
 * Each art-direction rule, proved to bite: the shipped layout is bent one way at
 * a time and the parser must refuse it. Without these, `farm-layout.test.ts`
 * would only prove the current numbers, not that a bad edit is caught.
 */
import { describe, expect, it } from 'vitest'
import { loadFarmLayout } from './farm-layout'
import { KEEPER_SPEED, cameraElevationDegrees, crossingSeconds, slowestCrossingSeconds } from './layout-rules'
import { parseFarmLayout } from './parse-farm-layout'
import { documentWith, documentWithHotspot, documentWithHotspots } from './test-fixtures'

function reasonFor(document: unknown): string {
  const parsed = parseFarmLayout(document)
  return parsed.ok ? 'accepted' : parsed.reason
}

describe('cameraElevationDegrees', () => {
  it('reads the storybook angle off the art-direction anchor', () => {
    expect(cameraElevationDegrees({ position: [9, 7, 12], lookAt: [0, 0.6, 0] })).toBeCloseTo(23.1, 1)
  })

  it('is 90° looking straight down and 0° from ground level', () => {
    expect(cameraElevationDegrees({ position: [0, 10, 0], lookAt: [0, 0, 0] })).toBe(90)
    expect(cameraElevationDegrees({ position: [0, 0.6, 10], lookAt: [0, 0.6, 0] })).toBe(0)
  })
})

describe('crossing time', () => {
  it('walks at the keeper speed the 30-unit farm and its 8 s crossing imply', () => {
    expect(KEEPER_SPEED).toBe(3.75)
    expect(crossingSeconds([0, 0], [KEEPER_SPEED, 0])).toBe(1)
    expect(crossingSeconds([0, 0], [0, 0])).toBe(0)
  })

  it('reports the slowest hotspot-to-hotspot walk, and nothing to walk is no walk', () => {
    const layout = loadFarmLayout()
    expect(slowestCrossingSeconds([])).toBe(0)
    expect(slowestCrossingSeconds(layout.hotspots)).toBeGreaterThan(0)
  })
})

describe('layout rules — a layout that breaks one is refused', () => {
  it('refuses a farm bigger than 30 × 30', () => {
    expect(reasonFor(documentWith({ ground: { size: [40, 30], material: 'grass' } }))).toBe(
      'ground.size: the farm is 40 × 30, over the 30 × 30 limit',
    )
  })

  it('refuses a field of view outside 30–40°', () => {
    const camera = { fov: 55, home: { position: [9, 7, 12], lookAt: [0, 0.6, 0] } }
    expect(reasonFor(documentWith({ camera }))).toBe('camera.fov: 55° is outside 30–40°')
  })

  it('refuses a top-down camera anchor', () => {
    const camera = { fov: 35, home: { position: [0, 20, 1], lookAt: [0, 0.6, 0] } }
    expect(reasonFor(documentWith({ camera }))).toMatch(/^camera\.home: elevation 8[0-9]\.\d° is outside 20–35°/)
  })

  it('refuses a hotspot camera anchor that is too flat', () => {
    const cameraAnchor = { position: [9, 2, 12], lookAt: [0, 0.6, -8] }
    expect(reasonFor(documentWithHotspot('barn', { cameraAnchor }))).toBe(
      'hotspots.barn.cameraAnchor: elevation 3.7° is outside 20–35°',
    )
  })

  it('refuses a footprint that reaches past the edge of the ground', () => {
    const footprint = { shape: 'box', centre: [14, -8], size: [4, 3.5] }
    expect(reasonFor(documentWithHotspot('barn', { footprint }))).toBe(
      'hotspots.barn.footprint: reaches past the edge of the ground',
    )
  })

  it('refuses an arrival point outside its own trigger', () => {
    expect(reasonFor(documentWithHotspot('barn', { arrival: [0, -1] }))).toBe(
      'hotspots.barn.arrival: outside its own trigger volume',
    )
  })

  it('refuses an arrival point off the ground', () => {
    const trigger = { shape: 'circle', centre: [0, -20], radius: 2 }
    expect(reasonFor(documentWithHotspot('barn', { arrival: [0, -20], trigger }))).toBe(
      'hotspots.barn.arrival: off the ground',
    )
  })

  it('refuses two trigger volumes that overlap', () => {
    const overlapping = documentWithHotspot('feed-shed', {
      arrival: [1, -5],
      trigger: { shape: 'circle', centre: [1, -5], radius: 2 },
    })
    expect(reasonFor(overlapping)).toBe('hotspots.barn.trigger: overlaps hotspots.feed-shed.trigger')
  })

  it('refuses a path or a prop placed off the ground', () => {
    const paths = [{ id: 'stray', width: 1.2, points: [[0, 0], [0, 40]] }]
    expect(reasonFor(documentWith({ paths }))).toBe('paths.stray.points: 1 point(s) off the ground')
    const props = [{ model: 'props/hay-bale', instances: [{ position: [40, 0, 0], rotationY: 0 }] }]
    expect(reasonFor(documentWith({ props }))).toBe('props.props/hay-bale: 1 instance(s) off the ground')
  })

  it('refuses a farm the keeper cannot cross in 8 s', () => {
    const stretched = documentWithHotspots({
      barn: { arrival: [-14, -14], trigger: { shape: 'circle', centre: [-14, -14], radius: 2 } },
      farmhouse: { arrival: [14, 14], trigger: { shape: 'circle', centre: [14, 14], radius: 2 } },
    })
    expect(reasonFor(stretched)).toMatch(/^hotspots: the farthest pair is a 10\.\d s walk, over the 8 s limit$/)
  })
})
