/**
 * The structural half of the parser: a hand-edited layout that is the wrong
 * shape is refused with the path that broke, before any art-direction rule
 * runs. `layout-rules.test.ts` covers the rules; this covers the shape.
 */
import { describe, expect, it } from 'vitest'
import { parseFarmLayout } from './parse-farm-layout'
import { documentWith, documentWithHotspot, farmDocument } from './test-fixtures'

function reasonFor(document: unknown): string {
  const parsed = parseFarmLayout(document)
  return parsed.ok ? 'accepted' : parsed.reason
}

const box = { shape: 'box', centre: [0, -8], size: [4, 3.5] }

describe('parseFarmLayout — document shape', () => {
  it('refuses anything that is not a layout object', () => {
    expect(reasonFor(null)).toBe('layout: expected an object')
    expect(reasonFor([])).toBe('layout: expected an object')
    expect(reasonFor('farm')).toBe('layout: expected an object')
  })

  it('refuses a __proto__ key rather than copying it', () => {
    const poisoned = JSON.parse('{"__proto__": {"polluted": true}}') as unknown
    expect(reasonFor(poisoned)).toBe('layout: forbidden key __proto__')
  })

  it('refuses an unknown top-level key', () => {
    expect(reasonFor(documentWith({ weather: 'rain' }))).toBe('layout: unknown key "weather"')
  })

  it('refuses any schema version but the current one', () => {
    expect(reasonFor(documentWith({ schemaVersion: 2 }))).toBe('schemaVersion: expected 1')
  })

  it('keeps nothing from the document that it did not validate', () => {
    const parsed = parseFarmLayout(farmDocument())
    if (!parsed.ok) throw new Error(parsed.reason)
    expect(Object.keys(parsed.layout).sort()).toEqual(['camera', 'ground', 'hotspots', 'paths', 'props', 'schemaVersion'])
  })
})

describe('parseFarmLayout — ground and camera', () => {
  it('refuses a ground material outside the closed set', () => {
    expect(reasonFor(documentWith({ ground: { size: [30, 30], material: 'lava' } }))).toMatch(
      /^ground\.material: expected one of grass/,
    )
  })

  it('refuses a ground size that is not two positive numbers', () => {
    expect(reasonFor(documentWith({ ground: { size: [30], material: 'grass' } }))).toBe(
      'ground.size: expected [width, depth]',
    )
    expect(reasonFor(documentWith({ ground: { size: [30, 0], material: 'grass' } }))).toBe(
      'ground.size[1]: expected a number greater than 0',
    )
    expect(reasonFor(documentWith({ ground: { size: 'big', material: 'grass' } }))).toBe(
      'ground.size: expected an array',
    )
  })

  it('refuses a camera with a non-finite field of view or a malformed anchor', () => {
    const home = { position: [9, 7, 12], lookAt: [0, 0.6, 0] }
    expect(reasonFor(documentWith({ camera: { fov: Number.NaN, home } }))).toBe('camera.fov: expected a finite number')
    expect(reasonFor(documentWith({ camera: { fov: 35, home: { ...home, position: [9, 7] } } }))).toBe(
      'camera.home.position: expected [x, y, z]',
    )
    expect(reasonFor(documentWith({ camera: { fov: 35, home: { ...home, lookAt: [0, '0.6', 0] } } }))).toBe(
      'camera.home.lookAt[1]: expected a finite number',
    )
  })
})

describe('parseFarmLayout — paths and props', () => {
  it('refuses a path with no id or fewer than two points', () => {
    expect(reasonFor(documentWith({ paths: [{ id: '', width: 1, points: [[0, 0], [1, 1]] }] }))).toBe(
      'paths[0].id: expected a non-empty string',
    )
    expect(reasonFor(documentWith({ paths: [{ id: 'stub', width: 1, points: [[0, 0]] }] }))).toBe(
      'paths[0].points: expected at least two points',
    )
    expect(reasonFor(documentWith({ paths: [{ id: 'stub', width: 1, points: [[0, 0], [1]] }] }))).toBe(
      'paths[0].points[1]: expected [x, z]',
    )
  })

  it('refuses a prop group with no instances, a bad model id, or a bad rotation', () => {
    const instance = { position: [0, 0, 0], rotationY: 0 }
    expect(reasonFor(documentWith({ props: [{ model: 'props/hay-bale', instances: [] }] }))).toBe(
      'props[0].instances: expected at least one instance',
    )
    expect(reasonFor(documentWith({ props: [{ model: 'Hay Bale', instances: [instance] }] }))).toBe(
      'props[0].model: expected a model id like "buildings/barn"',
    )
    expect(
      reasonFor(documentWith({ props: [{ model: 'props/hay-bale', instances: [{ ...instance, rotationY: 360 }] }] })),
    ).toBe('props[0].instances[0].rotationY: expected degrees in [0, 360)')
  })
})

describe('parseFarmLayout — hotspots', () => {
  it('refuses a hotspot id outside the seven', () => {
    expect(reasonFor(documentWithHotspot('barn', { id: 'castle' }))).toMatch(/^hotspots\[0\]\.id: expected one of barn/)
  })

  it('requires each of the seven hotspots exactly once', () => {
    const document = farmDocument()
    const hotspots = document.hotspots as Record<string, unknown>[]
    expect(reasonFor({ ...document, hotspots: hotspots.slice(1) })).toBe('hotspots: missing barn')
    expect(reasonFor({ ...document, hotspots: [...hotspots, hotspots[0]] })).toBe('hotspots: duplicate barn')
  })

  it('refuses an area that is neither a circle nor a box, or carries extra keys', () => {
    expect(reasonFor(documentWithHotspot('barn', { footprint: { shape: 'star', centre: [0, -8] } }))).toBe(
      'hotspots[0].footprint.shape: expected "circle" or "box"',
    )
    expect(reasonFor(documentWithHotspot('barn', { footprint: { ...box, radius: 2 } }))).toBe(
      'hotspots[0].footprint: unknown key "radius"',
    )
    expect(reasonFor(documentWithHotspot('barn', { trigger: { shape: 'circle', centre: [0, -5], radius: -1 } }))).toBe(
      'hotspots[0].trigger.radius: expected a number greater than 0',
    )
  })
})
