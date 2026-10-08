import type { GroundPiece } from '@sf/world'
import { describe, expect, it } from 'vitest'
import type { Rgb } from './ground-surface'
import { surfaceOf } from './ground-palette'

const PATH: GroundPiece = { kind: 'path', role: 'straight', rotation: 0 }

/** WCAG relative luminance from the linear channels a vertex colour holds. */
function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(one: Rgb, other: Rgb): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

/** Far enough apart in lightness to tell apart without relying on hue (colour-blind-safe, CLAUDE.md rule 8). */
const DISTINCT = 1.4

describe('ground colours', () => {
  // PR #121's paths were the atlas's blue-grey and read as canals.
  it('paints paths a warm colour, never a blue one, so they read as walkable earth', () => {
    const [r, , b] = surfaceOf(PATH).colour
    expect(r).toBeGreaterThan(b)
  })

  it('keeps paths apart from grass and from the dirt pens by lightness alone', () => {
    expect(contrast(surfaceOf(PATH).colour, surfaceOf({ kind: 'grass' }).colour)).toBeGreaterThanOrEqual(DISTINCT)
    expect(contrast(surfaceOf(PATH).colour, surfaceOf({ kind: 'dirt' }).colour)).toBeGreaterThanOrEqual(DISTINCT)
  })

  it('sinks water below the land and keeps the land flat', () => {
    expect(surfaceOf({ kind: 'water' }).height).toBeLessThan(0)
    expect(surfaceOf(PATH).height).toBe(0)
  })
})
