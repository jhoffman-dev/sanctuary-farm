import { describe, expect, it } from 'vitest'
import type { Vec3 } from '../piece-fit'
import { dominantBodyColour, dominantColour } from './body-colour'
import { hexToRgb, rgbToHex } from './colour-science'
import type { AtlasPixels, TexturedTriangle, UV } from './served-models'

/** A 2 × 1 atlas: left texel `left`, right texel `right`. */
function atlasOf(left: string, right: string): AtlasPixels {
  const rgba = new Uint8Array([...hexToRgb(left), 1, ...hexToRgb(right), 1].map((channel) => Math.round(channel * 255)))
  return { width: 2, height: 1, rgba }
}

/** A right triangle of the given area in the XZ plane, all corners sampling `uv`. */
function triangle(area: number, uv: UV): TexturedTriangle {
  const side = Math.sqrt(2 * area)
  const corners: [Vec3, Vec3, Vec3] = [
    [0, 0, 0],
    [side, 0, 0],
    [0, 0, side],
  ]
  return { corners, uvs: [uv, uv, uv] }
}

const LEFT: UV = [0.25, 0.5]
const RIGHT: UV = [0.75, 0.5]

describe('dominantBodyColour', () => {
  it('picks the colour covering the most surface area, not the most triangles', () => {
    const atlas = atlasOf('#ff0000', '#0000ff')
    const triangles = [triangle(1, LEFT), triangle(1, LEFT), triangle(3, RIGHT)]
    const { rgb, share } = dominantBodyColour(triangles, atlas)
    expect(rgbToHex(rgb)).toBe('#0000ff')
    expect(share).toBeCloseTo(0.6, 6)
  })

  it('multiplies the tint into the texel in linear light, as three draws it', () => {
    const atlas = atlasOf('#ffffff', '#000000')
    expect(rgbToHex(dominantBodyColour([triangle(1, LEFT)], atlas, '#b3ccff').rgb)).toBe('#b3ccff')
    const grey = atlasOf('#808080', '#000000')
    // 0x80 is 0.216 linear; halving it in linear light gives 0.108, which is sRGB 0x5d — not 0x40.
    expect(rgbToHex(dominantBodyColour([triangle(1, LEFT)], grey, '#bcbcbc').rgb)).toBe('#5d5d5d')
  })

  it('wraps UVs outside 0–1, as the GLBs’ repeat sampler does', () => {
    const atlas = atlasOf('#ff0000', '#0000ff')
    expect(rgbToHex(dominantBodyColour([triangle(1, [1.75, 0.5])], atlas).rgb)).toBe('#0000ff')
    expect(rgbToHex(dominantBodyColour([triangle(1, [-0.75, 0.5])], atlas).rgb)).toBe('#ff0000')
  })

  it('refuses a model with no triangles', () => {
    expect(() => dominantBodyColour([], atlasOf('#000000', '#000000'))).toThrow(/no dominant colour/)
  })
})

describe('dominantColour', () => {
  it('counts near-identical shades of one colour as one, so a gradient beats a single flat patch', () => {
    const pinks = ['#e28aae', '#e58fb7', '#db7d96'].map((hex) => ({ rgb: hexToRgb(hex), area: 1 }))
    const { rgb, share } = dominantColour([...pinks, { rgb: hexToRgb('#cc7854'), area: 2 }])
    expect(share).toBeCloseTo(0.6, 6)
    expect(rgbToHex(rgb)).toMatch(/^#e/)
  })

  it('keeps a body and its marking apart', () => {
    const { share } = dominantColour([
      { rgb: hexToRgb('#dcdce9'), area: 3 },
      { rgb: hexToRgb('#2f2a26'), area: 1 },
    ])
    expect(share).toBeCloseTo(0.75, 6)
  })
})
