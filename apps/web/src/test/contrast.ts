import { Color } from 'three'

/** Linear-light red, green and blue in 0..1, as a three.js `Color` or a vertex colour holds them. */
export type LinearRgb = readonly [number, number, number]

/** A CSS hex colour as linear channels. */
export function linearOf(hex: string): LinearRgb {
  const { r, g, b } = new Color(hex)
  return [r, g, b]
}

/** WCAG relative luminance from linear channels. */
function luminance([r, g, b]: LinearRgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The WCAG contrast ratio between two colours, 1..21. */
export function contrast(one: LinearRgb, other: LinearRgb): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}
