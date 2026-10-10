/**
 * Colour maths for the animal-identification check (art-direction §3): sRGB to
 * CIELAB, CIEDE2000 colour difference, and colour-vision-deficiency simulation.
 * Pure functions over plain numbers; channels are 0–1 throughout.
 */

export type Rgb = readonly [number, number, number]
export type Lab = readonly [number, number, number]
type Matrix3 = readonly [Rgb, Rgb, Rgb]

export const VISIONS = ['normal', 'deuteranopia', 'protanopia', 'tritanopia'] as const
export type Vision = (typeof VISIONS)[number]

/**
 * Machado, Oliveira & Fernandes (2009), severity 1.0: the full dichromacies.
 * They act on linear RGB, so callers linearise first (`simulateVision` does).
 */
export const MACHADO_2009: Readonly<Record<Exclude<Vision, 'normal'>, Matrix3>> = {
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export function linearToSrgb(channel: number): number {
  const c = clamp01(channel)
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
}

function multiply(matrix: Matrix3, [r, g, b]: Rgb): Rgb {
  const row = (i: 0 | 1 | 2) => matrix[i][0] * r + matrix[i][1] * g + matrix[i][2] * b
  return [row(0), row(1), row(2)]
}

/** What a viewer with `vision` sees of an sRGB colour, as sRGB. */
export function simulateVision(srgb: Rgb, vision: Vision): Rgb {
  if (vision === 'normal') return srgb
  const linear = srgb.map(srgbToLinear) as unknown as Rgb
  return multiply(MACHADO_2009[vision], linear).map(linearToSrgb) as unknown as Rgb
}

const SRGB_TO_XYZ: Matrix3 = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
]
const D65_WHITE: Rgb = [0.95047, 1, 1.08883]

/** sRGB (D65) to CIELAB. */
export function srgbToLab(srgb: Rgb): Lab {
  const xyz = multiply(SRGB_TO_XYZ, srgb.map(srgbToLinear) as unknown as Rgb)
  const f = (t: number) => (t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29)
  const [fx, fy, fz] = xyz.map((value, i) => f(value / D65_WHITE[i]!)) as [number, number, number]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

export function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('')}`
}

const degrees = (radians: number) => (radians * 180) / Math.PI
const radians = (deg: number) => (deg * Math.PI) / 180

function hueDegrees(b: number, a: number): number {
  if (a === 0 && b === 0) return 0
  const h = degrees(Math.atan2(b, a))
  return h >= 0 ? h : h + 360
}

/** The hue difference and mean hue of CIEDE2000, with its wrap-around rules at 180°. */
function hueTerms(h1: number, h2: number, chromaProduct: number): { dh: number; meanH: number } {
  if (chromaProduct === 0) return { dh: 0, meanH: h1 + h2 }
  const diff = h2 - h1
  const dh = Math.abs(diff) <= 180 ? diff : diff > 180 ? diff - 360 : diff + 360
  const sum = h1 + h2
  const meanH = Math.abs(diff) <= 180 ? sum / 2 : sum < 360 ? (sum + 360) / 2 : (sum - 360) / 2
  return { dh, meanH }
}

/** CIEDE2000 colour difference (Sharma, Wu & Dalal 2005), with kL = kC = kH = 1. */
export function ciede2000([l1, a1, b1]: Lab, [l2, a2, b2]: Lab): number {
  const meanC = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2
  const g = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)))
  const a1p = (1 + g) * a1
  const a2p = (1 + g) * a2
  const c1p = Math.hypot(a1p, b1)
  const c2p = Math.hypot(a2p, b2)
  const { dh, meanH } = hueTerms(hueDegrees(b1, a1p), hueDegrees(b2, a2p), c1p * c2p)
  const dL = l2 - l1
  const dC = c2p - c1p
  const dH = 2 * Math.sqrt(c1p * c2p) * Math.sin(radians(dh / 2))
  const meanL = (l1 + l2) / 2
  const meanCp = (c1p + c2p) / 2
  const t =
    1 -
    0.17 * Math.cos(radians(meanH - 30)) +
    0.24 * Math.cos(radians(2 * meanH)) +
    0.32 * Math.cos(radians(3 * meanH + 6)) -
    0.2 * Math.cos(radians(4 * meanH - 63))
  const sL = 1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2)
  const sC = 1 + 0.045 * meanCp
  const sH = 1 + 0.015 * meanCp * t
  const rT =
    -2 * Math.sqrt(meanCp ** 7 / (meanCp ** 7 + 25 ** 7)) * Math.sin(radians(60 * Math.exp(-(((meanH - 275) / 25) ** 2))))
  return Math.sqrt((dL / sL) ** 2 + (dC / sC) ** 2 + (dH / sH) ** 2 + rT * (dC / sC) * (dH / sH))
}

/** ΔE00 between two sRGB colours as a viewer with `vision` sees them. */
export function perceivedDifference(a: Rgb, b: Rgb, vision: Vision): number {
  return ciede2000(srgbToLab(simulateVision(a, vision)), srgbToLab(simulateVision(b, vision)))
}
