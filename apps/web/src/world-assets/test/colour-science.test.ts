import { describe, expect, it } from 'vitest'
import {
  ciede2000,
  hexToRgb,
  type Lab,
  linearToSrgb,
  perceivedDifference,
  rgbToHex,
  simulateVision,
  srgbToLab,
  srgbToLinear,
  VISIONS,
} from './colour-science'

describe('CIEDE2000', () => {
  // Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference Formula", Table 1:
  // pairs chosen for the formula's edge cases (hue wrap at 180°, near-neutral, dark).
  const SHARMA: readonly [Lab, Lab, number][] = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, -0.001, 2.49], [50, 0.0009, -2.49], 4.8045],
    [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
    [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ]

  it.each(SHARMA)('matches the published difference for %j and %j', (a, b, expected) => {
    expect(ciede2000(a, b)).toBeCloseTo(expected, 4)
  })

  it('is symmetric and zero for identical colours', () => {
    const [a, b] = SHARMA[5]!
    expect(ciede2000(a, b)).toBeCloseTo(ciede2000(b, a), 10)
    expect(ciede2000(a, a)).toBe(0)
  })
})

describe('sRGB to CIELAB', () => {
  it('puts white at L 100 on the neutral axis and black at 0', () => {
    const [l, a, b] = srgbToLab([1, 1, 1])
    expect(l).toBeCloseTo(100, 2)
    expect(Math.abs(a) + Math.abs(b)).toBeLessThan(0.01)
    expect(srgbToLab([0, 0, 0])[0]).toBeCloseTo(0, 6)
  })

  it('matches the reference value for pure sRGB red', () => {
    const [l, a, b] = srgbToLab([1, 0, 0])
    expect(l).toBeCloseTo(53.24, 1)
    expect(a).toBeCloseTo(80.09, 1)
    expect(b).toBeCloseTo(67.2, 1)
  })

  it('round-trips the sRGB transfer curve on both sides of its linear toe', () => {
    for (const channel of [0, 0.02, 0.04045, 0.5, 1]) expect(linearToSrgb(srgbToLinear(channel))).toBeCloseTo(channel, 6)
  })

  it('reads and writes hex colours', () => {
    expect(hexToRgb('#ff8000')).toEqual([1, 128 / 255, 0])
    expect(rgbToHex([1, 128 / 255, 0])).toBe('#ff8000')
  })
})

describe('colour-vision simulation (Machado 2009, severity 1)', () => {
  it('leaves normal vision untouched', () => {
    expect(simulateVision([0.2, 0.4, 0.6], 'normal')).toEqual([0.2, 0.4, 0.6])
  })

  it('keeps greys grey under every dichromacy, since each matrix row sums to about 1', () => {
    for (const vision of VISIONS) {
      const [r, g, b] = simulateVision([0.5, 0.5, 0.5], vision)
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(0.01)
    }
  })

  it('collapses red against green for deuteranopes and protanopes but not for tritanopes', () => {
    const red = hexToRgb('#d55e00')
    const green = hexToRgb('#6b8e23')
    expect(perceivedDifference(red, green, 'normal')).toBeGreaterThan(30)
    expect(perceivedDifference(red, green, 'deuteranopia')).toBeLessThan(15)
    expect(perceivedDifference(red, green, 'protanopia')).toBeLessThan(15)
    expect(perceivedDifference(red, green, 'tritanopia')).toBeGreaterThan(20)
  })

  it('collapses blue against green for tritanopes', () => {
    expect(perceivedDifference(hexToRgb('#56b4e9'), hexToRgb('#009e73'), 'normal')).toBeGreaterThan(15)
    expect(perceivedDifference(hexToRgb('#56b4e9'), hexToRgb('#009e73'), 'tritanopia')).toBeLessThan(
      perceivedDifference(hexToRgb('#56b4e9'), hexToRgb('#009e73'), 'normal'),
    )
  })
})
