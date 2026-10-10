import { describe, expect, it } from 'vitest'
import { routeToNetwork } from './route-paths'
import { CHUNK_SIZE } from './tile-grid'

const at = (x: number, z: number): number => z * CHUNK_SIZE + x

describe('routeToNetwork', () => {
  it('takes the cheapest route to the nearest network tile, both ends included', () => {
    const route = routeToNetwork({ from: at(0, 0), network: new Set([at(3, 0), at(15, 15)]), stepCost: () => 1 })
    expect(route).toEqual([at(0, 0), at(1, 0), at(2, 0), at(3, 0)])
  })

  it('goes round a wall when there is a way round', () => {
    const wall = new Set([at(1, 0), at(1, 1), at(1, 2)])
    const route = routeToNetwork({
      from: at(0, 0),
      network: new Set([at(2, 0)]),
      stepCost: (index) => (wall.has(index) ? 1000 : 1),
    })
    expect(route.some((index) => wall.has(index))).toBe(false)
    expect(route.at(-1)).toBe(at(2, 0))
  })

  it('crosses a wall that seals the goal off rather than failing', () => {
    const wall = new Set(Array.from({ length: CHUNK_SIZE }, (_, z) => at(1, z)))
    const route = routeToNetwork({
      from: at(0, 5),
      network: new Set([at(2, 5)]),
      stepCost: (index) => (wall.has(index) ? 1000 : 1),
    })
    expect(route).toEqual([at(0, 5), at(1, 5), at(2, 5)])
  })

  it('returns no route when there is no network to join', () => {
    expect(routeToNetwork({ from: at(0, 0), network: new Set(), stepCost: () => 1 })).toEqual([])
  })
})
