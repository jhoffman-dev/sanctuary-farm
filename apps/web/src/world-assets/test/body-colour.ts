import type { Vec3 } from '../piece-fit'
import { ciede2000, hexToRgb, linearToSrgb, type Rgb, srgbToLab, srgbToLinear } from './colour-science'
import type { AtlasPixels, TexturedTriangle } from './served-models'

/**
 * Atlas shades closer than this (ΔE00) count as one colour. Kenney's atlas cells
 * are gentle gradients, so one body colour arrives as a dozen near-identical
 * texels; 10 merges a gradient without merging a body with its marking.
 */
const SAME_COLOUR = 10

export type BodyColour = {
  /** sRGB, as rendered: the atlas texel multiplied by the material's tint, before lighting. */
  readonly rgb: Rgb
  /** Fraction of the model's surface area that is this colour. */
  readonly share: number
}

/** One sampled colour and how much surface (or how many pixels) it covers. */
export type Swatch = { readonly rgb: Rgb; readonly area: number }

function triangleArea([a, b, c]: readonly [Vec3, Vec3, Vec3]): number {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const
  return Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2
}

/** The texel under a UV, glTF-style (v = 0 is the image's top row) with repeat wrapping. */
function texelAt(atlas: AtlasPixels, [u, v]: readonly [number, number]): Rgb {
  const wrap = (t: number, size: number) => Math.min(size - 1, Math.floor((t - Math.floor(t)) * size))
  const at = (wrap(v, atlas.height) * atlas.width + wrap(u, atlas.width)) * 4
  return [atlas.rgba[at]! / 255, atlas.rgba[at + 1]! / 255, atlas.rgba[at + 2]! / 255]
}

/** What three.js draws before lighting: the decoded texel times `material.color`, both linear. */
function tinted(texel: Rgb, tint: Rgb): Rgb {
  return texel.map((channel, i) => linearToSrgb(srgbToLinear(channel) * srgbToLinear(tint[i]!))) as unknown as Rgb
}

/** Area-weighted mean in linear light, so a mix of shades averages as light does. */
function meanColour(swatches: readonly Swatch[]): Rgb {
  const total = swatches.reduce((sum, swatch) => sum + swatch.area, 0)
  const channel = (i: number) =>
    linearToSrgb(swatches.reduce((sum, swatch) => sum + srgbToLinear(swatch.rgb[i]!) * swatch.area, 0) / total)
  return [channel(0), channel(1), channel(2)]
}

/** Groups swatches, largest first, under the first group seed within `SAME_COLOUR`. */
function groupShades(swatches: readonly Swatch[]): Swatch[][] {
  const groups: { seed: ReturnType<typeof srgbToLab>; members: Swatch[] }[] = []
  for (const swatch of swatches.toSorted((a, b) => b.area - a.area)) {
    const lab = srgbToLab(swatch.rgb)
    const group = groups.find(({ seed }) => ciede2000(seed, lab) < SAME_COLOUR)
    if (group) group.members.push(swatch)
    else groups.push({ seed: lab, members: [swatch] })
  }
  return groups.map(({ members }) => members)
}

/** The largest group of near-identical shades among `swatches`, by area. */
export function dominantColour(swatches: readonly Swatch[]): BodyColour {
  if (swatches.length === 0) throw new Error('Nothing sampled, so no dominant colour')
  const total = swatches.reduce((sum, swatch) => sum + swatch.area, 0)
  const groupArea = (group: readonly Swatch[]) => group.reduce((sum, swatch) => sum + swatch.area, 0)
  const largest = groupShades(swatches).reduce((best, group) => (groupArea(group) > groupArea(best) ? group : best))
  return { rgb: meanColour(largest), share: groupArea(largest) / total }
}

/**
 * A model's dominant body colour by surface area: each triangle takes the atlas
 * texel under its UV centroid (Kenney's flat-shaded faces each sit inside one
 * atlas cell), shades of one colour are grouped, and the largest group wins.
 */
export function dominantBodyColour(
  triangles: readonly TexturedTriangle[],
  atlas: AtlasPixels,
  tint = '#ffffff',
): BodyColour {
  const tintRgb = hexToRgb(tint)
  return dominantColour(
    triangles.map(({ corners, uvs }) => ({
      rgb: tinted(texelAt(atlas, [(uvs[0][0] + uvs[1][0] + uvs[2][0]) / 3, (uvs[0][1] + uvs[1][1] + uvs[2][1]) / 3]), tintRgb),
      area: triangleArea(corners),
    })),
  )
}
