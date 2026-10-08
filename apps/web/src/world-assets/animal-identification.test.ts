import { describe, expect, it } from 'vitest'
import { KENNEY_ANIMALS } from './kenney-catalogue'
import { ANIMAL_SPECIES, type AnimalSpecies } from './piece-kinds'
import { dominantBodyColour } from './test/body-colour'
import { perceivedDifference, type Rgb, rgbToHex, VISIONS, type Vision } from './test/colour-science'
import { readAtlasPixels, readTexturedTriangles } from './test/served-models'

/**
 * Art-direction §3: Cube Pets share one cube silhouette (ADR-0003: pairwise
 * IoU 0.82–0.94 at 64 px), so a child tells the animals apart by colour and
 * size. Every pair must differ in body colour by at least `MIN_COLOUR_DIFFERENCE`
 * (CIEDE2000) for every viewer — normal vision and the three dichromacies — or
 * else in height by at least `MIN_HEIGHT_RATIO`.
 *
 * The colour is the one drawn: Kenney's atlas texel times the catalogue's tint,
 * read from the GLBs and atlas that ship.
 */
const MIN_COLOUR_DIFFERENCE = 20
const MIN_HEIGHT_RATIO = 1.3

type Measured = { readonly species: AnimalSpecies; readonly rgb: Rgb; readonly share: number; readonly height: number }

function measure(species: AnimalSpecies): Measured {
  const model = KENNEY_ANIMALS[species]
  const { rgb, share } = dominantBodyColour(
    readTexturedTriangles(model.url),
    readAtlasPixels(model.atlasUrl),
    model.tint,
  )
  const height = (model.nativeBounds.max[1] - model.nativeBounds.min[1]) * model.scale
  return { species, rgb, share, height }
}

type PairVerdict = {
  readonly pair: string
  readonly differences: Readonly<Record<Vision, number>>
  readonly heightRatio: number
  readonly passes: boolean
}

function judge(a: Measured, b: Measured): PairVerdict {
  const differences = Object.fromEntries(
    VISIONS.map((vision) => [vision, perceivedDifference(a.rgb, b.rgb, vision)]),
  ) as Record<Vision, number>
  const heightRatio = Math.max(a.height, b.height) / Math.min(a.height, b.height)
  const coloursApart = VISIONS.every((vision) => differences[vision] >= MIN_COLOUR_DIFFERENCE)
  return { pair: `${a.species} / ${b.species}`, differences, heightRatio, passes: coloursApart || heightRatio >= MIN_HEIGHT_RATIO }
}

function tableOf(verdicts: readonly PairVerdict[]): string {
  const header = `| pair | ${VISIONS.join(' | ')} | height ratio | verdict |`
  const rows = verdicts.map(
    ({ pair, differences, heightRatio, passes }) =>
      `| ${pair} | ${VISIONS.map((vision) => differences[vision].toFixed(1)).join(' | ')} | ${heightRatio.toFixed(2)} | ${passes ? 'pass' : 'FAIL'} |`,
  )
  return [header, `|${' --- |'.repeat(VISIONS.length + 3)}`, ...rows].join('\n')
}

const measured = ANIMAL_SPECIES.map(measure)
const pairs = measured.flatMap((a, i) => measured.slice(i + 1).map((b) => judge(a, b)))

describe('animal identification by colour and size (art-direction §3)', () => {
  it('measures a body colour that covers a real share of each animal', () => {
    // Printed so the numbers in art-direction §3 and the PR can be checked against a run.
    console.info(measured.map((m) => `${m.species}: ${rgbToHex(m.rgb)} (${(m.share * 100).toFixed(0)}% of surface), ${m.height.toFixed(2)} m`).join('\n'))
    console.info(tableOf(pairs))
    for (const { species, share } of measured) expect(share, species).toBeGreaterThan(0.3)
  })

  it.each(pairs.map((verdict) => [verdict.pair, verdict] as const))('%s is told apart by colour or size', (_, verdict) => {
    const worst = VISIONS.reduce((low, vision) => (verdict.differences[vision] < verdict.differences[low] ? vision : low))
    expect(
      verdict.passes,
      `${verdict.pair}: ΔE00 ${verdict.differences[worst].toFixed(1)} under ${worst} (needs ≥ ${MIN_COLOUR_DIFFERENCE}) ` +
        `and height ratio ${verdict.heightRatio.toFixed(2)} (needs ≥ ${MIN_HEIGHT_RATIO})`,
    ).toBe(true)
  })

  it('keeps the §2 size order: chick < pig = hog < cow', () => {
    const height = (species: AnimalSpecies) => measured.find((m) => m.species === species)!.height
    expect(height('chick')).toBeLessThan(height('pig'))
    expect(height('hog')).toBeCloseTo(height('pig'), 6)
    expect(height('pig')).toBeLessThan(height('cow'))
  })
})
