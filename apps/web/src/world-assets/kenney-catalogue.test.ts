import { describe, expect, it } from 'vitest'
import { KENNEY_ANIMALS, KENNEY_CATALOGUE, KENNEY_KEEPERS, KENNEY_KITS, kitDirectory, type PieceModel } from './kenney-catalogue'
import { PIECE_IDS, type PieceId } from '@sf/world'
import { ANIMAL_SPECIES, KEEPER_VARIANTS } from './piece-kinds'
import { LICENCES, measureBounds, readGltfJson, SERVED_URLS } from './test/served-models'

/** Tile pieces, animals and keepers alike: every model the catalogue serves. */
const entries: [string, PieceModel][] = [
  ...Object.entries(KENNEY_CATALOGUE),
  ...Object.entries(KENNEY_ANIMALS).map(([species, model]): [string, PieceModel] => [`animal:${species}`, model]),
  ...Object.entries(KENNEY_KEEPERS).map(([variant, model]): [string, PieceModel] => [`keeper:${variant}`, model]),
]

/**
 * Keys that deliberately draw the same GLB. A full road tile joins on every
 * side, so every path role is that tile; Fantasy Town's one fence run stands in
 * for the end, tee and cross it does not have (each marked placeholder).
 */
const SHARED_ON_PURPOSE: readonly (readonly string[])[] = [
  ['path:end', 'path:straight', 'path:corner', 'path:tee', 'path:cross'],
  ['fence:end', 'fence:straight', 'fence:tee', 'fence:cross'],
  ['fence-gate', 'hotspot:paddock'],
  ['building-wall-door', 'hotspot:farmhouse'],
]

/** Art-direction §2 heights, plus the two extra pets (bunny, dog) sized between chick and pig. */
const GROUND_TILES = new Set<string>(['grass', 'dirt', 'water', 'path:end', 'path:straight', 'path:corner', 'path:tee', 'path:cross'] satisfies PieceId[])

/** Art-direction §2; the dog is 0.67 so size alone parts it from the pig, hog and chick (§3). */
const SPECIES_HEIGHT = { cow: 1.3, pig: 0.9, hog: 0.9, chick: 0.5, bunny: 0.6, dog: 0.67 } as const

describe('the Kenney piece catalogue', () => {
  it('maps exactly the tile world\'s PieceId vocabulary, no more', () => {
    expect(Object.keys(KENNEY_CATALOGUE).toSorted()).toEqual([...PIECE_IDS].toSorted())
  })

  it('points every entry at a GLB and an atlas that are actually served', () => {
    for (const [key, model] of entries) {
      expect(SERVED_URLS.has(model.url), `${key} → ${model.url}`).toBe(true)
      expect(SERVED_URLS.has(model.atlasUrl), `${key} → ${model.atlasUrl}`).toBe(true)
    }
  })

  it('ships each GLB referencing its kit atlas by relative URI, never embedding a copy', () => {
    for (const [key, model] of entries) {
      expect(readGltfJson(model.url).images, key).toEqual([{ uri: 'Textures/colormap.png', name: 'colormap' }])
      expect(model.atlasUrl).toBe(`${kitDirectory(model.kit)}/Textures/colormap.png`)
    }
  })

  it('declares bounds that match the GLB it points at', () => {
    for (const [key, model] of entries) {
      const measured = measureBounds(readGltfJson(model.url))
      for (let axis = 0; axis < 3; axis++) {
        expect(model.nativeBounds.min[axis], `${key} min[${axis}]`).toBeCloseTo(measured.min[axis] ?? NaN, 2)
        expect(model.nativeBounds.max[axis], `${key} max[${axis}]`).toBeCloseTo(measured.max[axis] ?? NaN, 2)
      }
    }
  })

  it('gives every entry a positive whole-tile footprint and a positive scale', () => {
    for (const [key, model] of entries) {
      expect(Number.isInteger(model.footprint.x) && model.footprint.x > 0, key).toBe(true)
      expect(Number.isInteger(model.footprint.z) && model.footprint.z > 0, key).toBe(true)
      expect(model.scale, key).toBeGreaterThan(0)
    }
  })

  it('uses one GLB for two keys only where that is intended', () => {
    const keysByUrl = new Map<string, string[]>()
    for (const [key, model] of entries) keysByUrl.set(model.url, [...(keysByUrl.get(model.url) ?? []), key])
    const shared = [...keysByUrl.values()].filter((keys) => keys.length > 1).map((keys) => keys.toSorted())
    expect(shared.toSorted()).toEqual(SHARED_ON_PURPOSE.map((keys) => [...keys].toSorted()).toSorted())
  })

  it('explains every placeholder', () => {
    for (const [key, model] of entries) {
      expect(model.placeholder ? (model.note ?? '').length > 0 : model.note === undefined, key).toBe(true)
    }
  })

  it('sits ground tiles with their top at y = 0 and everything else with its base at y = 0', () => {
    for (const [key, model] of entries) {
      const restingY = GROUND_TILES.has(key) ? model.nativeBounds.max[1] : model.nativeBounds.min[1]
      expect(restingY * model.scale + model.yOffset, key).toBeCloseTo(0, 6)
    }
  })

  it('sizes animals to their species height and the keeper to 1.6 units', () => {
    for (const species of ANIMAL_SPECIES) {
      const model = KENNEY_ANIMALS[species]
      const height = (model.nativeBounds.max[1] - model.nativeBounds.min[1]) * model.scale
      expect(height, species).toBeCloseTo(SPECIES_HEIGHT[species], 6)
    }
    for (const variant of KEEPER_VARIANTS) {
      const model = KENNEY_KEEPERS[variant]
      expect((model.nativeBounds.max[1] - model.nativeBounds.min[1]) * model.scale, variant).toBeCloseTo(1.6, 6)
    }
  })

  it('turns animals and the keeper (which face +Z) two quarter turns to face north (§8)', () => {
    for (const species of ANIMAL_SPECIES) expect(KENNEY_ANIMALS[species].rotationOffset).toBeCloseTo(Math.PI, 12)
    for (const variant of KEEPER_VARIANTS) expect(KENNEY_KEEPERS[variant].rotationOffset).toBeCloseTo(Math.PI, 12)
  })

  it('ships the §8 animation clips with every animal and the keeper', () => {
    const clips = (url: string) => (readGltfJson(url).animations ?? []).map((clip) => clip.name)
    for (const species of ANIMAL_SPECIES) {
      expect(clips(KENNEY_ANIMALS[species].url), species).toEqual(expect.arrayContaining(['idle', 'walk', 'eat']))
    }
    for (const variant of KEEPER_VARIANTS) {
      expect(clips(KENNEY_KEEPERS[variant].url), variant).toEqual(expect.arrayContaining(['idle', 'walk']))
    }
  })

  it('draws on every listed kit, and ships each kit CC0 licence beside its models', () => {
    for (const kit of KENNEY_KITS) {
      expect(entries.some(([, model]) => model.kit === kit), kit).toBe(true)
      expect(LICENCES.get(`${kitDirectory(kit)}/License.txt`), kit).toContain('Creative Commons Zero, CC0')
    }
  })
})
