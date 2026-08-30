import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { CARE_TASKS } from '@/contracts'
import { defaultCreatureParams } from '@/creatures/definitions'
import { CareScene } from './CareScene'

const creature = {
  family: 10,
  name: 'Tenner',
  params: defaultCreatureParams(10),
  hatchedAt: 0,
  stallIndex: 0,
}

describe('CareScene', () => {
  it.each(CARE_TASKS)('renders the %s scene cleanly at every progress step', (task) => {
    for (const done of [0, 2, 4]) {
      const { container, unmount } = render(
        <CareScene task={task} creature={creature} name="Tenner" done={done} total={4} />,
      )
      const svg = container.querySelector('svg')!
      expect(svg.outerHTML).not.toMatch(/NaN|undefined|Infinity/)
      unmount()
    }
  })

  it('the feed/water trough reports a rising fill level', () => {
    const pctAt = (done: number) => {
      const { container, unmount } = render(
        <CareScene task="water" creature={creature} name="T" done={done} total={4} />,
      )
      const label = container.querySelector('svg')!.getAttribute('aria-label') ?? ''
      const pct = Number(label.match(/(\d+)% full/)?.[1] ?? -1)
      unmount()
      return pct
    }
    expect(pctAt(0)).toBe(0)
    expect(pctAt(2)).toBe(50)
    expect(pctAt(4)).toBe(100)
  })

  it('the clean scene shows fewer dirt clumps as answers land', () => {
    const dirtAt = (done: number) => {
      const { container, unmount } = render(
        <CareScene task="clean" creature={creature} name="T" done={done} total={4} />,
      )
      const groups = [...container.querySelectorAll('g[fill="#6b4a2b"]')].length
      unmount()
      return groups
    }
    expect(dirtAt(0)).toBeGreaterThan(dirtAt(3))
  })
})
