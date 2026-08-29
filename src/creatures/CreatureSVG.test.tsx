import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { CreatureMood } from '@/contracts'
import { CreatureSVG } from './CreatureSVG'
import { defaultCreatureParams } from './definitions'

const FAMILIES = Array.from({ length: 12 }, (_, i) => i + 1)
const MOODS: CreatureMood[] = ['idle', 'happy', 'eating', 'puzzled', 'sleeping']
const COORD_ATTRS = [
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height',
]

function assertClean(svg: SVGElement, size: number) {
  expect(svg.getAttribute('width')).toBe(String(size))
  expect(svg.getAttribute('height')).toBe(String(size))
  expect(svg.getAttribute('viewBox')).toBe('0 0 100 100')

  const html = svg.outerHTML
  expect(html).not.toMatch(/NaN/)
  expect(html).not.toMatch(/undefined/)
  expect(html).not.toMatch(/Infinity/)

  const shapes = svg.querySelectorAll('ellipse, circle, path, rect, line, text')
  expect(shapes.length).toBeGreaterThan(5)

  for (const el of Array.from(svg.querySelectorAll('*'))) {
    for (const attr of COORD_ATTRS) {
      const raw = el.getAttribute(attr)
      if (raw == null || raw.endsWith('%')) continue
      const v = Number(raw)
      expect(Number.isFinite(v), `${el.tagName}.${attr}=${raw}`).toBe(true)
      // viewBox is 0..100; allow a small margin for stroke width / clamps.
      expect(v, `${el.tagName}.${attr}=${raw}`).toBeGreaterThan(-10)
      expect(v, `${el.tagName}.${attr}=${raw}`).toBeLessThan(110)
    }
    const d = el.getAttribute('d')
    if (d) {
      for (const num of d.match(/-?\d+(\.\d+)?/g) ?? []) {
        expect(Number.isFinite(Number(num))).toBe(true)
      }
    }
  }
}

describe('CreatureSVG', () => {
  it('renders all 12 creatures cleanly at 200px and 64px', () => {
    for (const family of FAMILIES) {
      const params = defaultCreatureParams(family)
      for (const size of [200, 64]) {
        const { container, unmount } = render(
          <CreatureSVG params={params} mood="idle" size={size} title={`family ${family}`} />,
        )
        const svg = container.querySelector('svg')!
        assertClean(svg, size)
        unmount()
      }
    }
  })

  it('matches snapshot for every family at 200px', () => {
    for (const family of FAMILIES) {
      const { container, unmount } = render(
        <CreatureSVG params={defaultCreatureParams(family)} mood="idle" size={200} />,
      )
      expect(container.firstChild).toMatchSnapshot(`family-${family}`)
      unmount()
    }
  })

  it('draws a distinct face + marker for every mood', () => {
    const params = defaultCreatureParams(10)
    const signatures = MOODS.map((mood) => {
      const { container, unmount } = render(
        <CreatureSVG params={params} mood={mood} size={120} />,
      )
      const svg = container.querySelector('svg')!
      const mouth = svg.querySelector('[data-part^="mouth-"]')?.getAttribute('data-part')
      const eyes = svg.querySelector('[data-part="eyes"]')?.getAttribute('data-eyes')
      const zzz = svg.querySelector('[data-part="zzz"]') ? 'zzz' : ''
      const brow = svg.querySelector('[data-part="eyebrow"]') ? 'brow' : ''
      const sig = `${svg.getAttribute('data-mood')}|${mouth}|${eyes}|${zzz}|${brow}`
      unmount()
      return sig
    })
    expect(new Set(signatures).size).toBe(MOODS.length)
  })

  it('only the sleeping mood shows the "z" glyphs', () => {
    const params = defaultCreatureParams(3)
    for (const mood of MOODS) {
      const { container, unmount } = render(
        <CreatureSVG params={params} mood={mood} size={100} />,
      )
      const hasZ = !!container.querySelector('[data-part="zzz"]')
      expect(hasZ).toBe(mood === 'sleeping')
      unmount()
    }
  })
})
