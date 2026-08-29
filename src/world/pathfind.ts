// A* over the walkability grid. Returns tile-coordinate waypoints (the `from`
// tile is not included, `to` is the last element; [] when already there),
// or null when `to` is unwalkable / out of bounds / unreachable.
//
// Diagonal steps are allowed only when BOTH shared orthogonal neighbours are
// walkable, so the character never clips a fence corner.
import type { FindPath, Tilemap, Vec2 } from '@/contracts'

const STEPS: readonly Vec2[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
]

const inBounds = (map: Tilemap, x: number, y: number) =>
  x >= 0 && y >= 0 && x < map.width && y < map.height

export const findPath: FindPath = (map, from, to) => {
  if (!inBounds(map, to.x, to.y) || !map.isWalkable(to.x, to.y)) return null
  if (from.x === to.x && from.y === to.y) return []

  const key = (x: number, y: number) => y * map.width + x
  const start = key(from.x, from.y)
  const goal = key(to.x, to.y)

  // octile distance — admissible for 8-way movement with √2 diagonal cost
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - to.x)
    const dy = Math.abs(y - to.y)
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy)
  }

  const gScore = new Map<number, number>([[start, 0]])
  const fScore = new Map<number, number>([[start, h(from.x, from.y)]])
  const cameFrom = new Map<number, number>()
  const open = new Set<number>([start])

  while (open.size > 0) {
    let current = -1
    let bestF = Infinity
    for (const node of open) {
      const f = fScore.get(node) ?? Infinity
      if (f < bestF) {
        bestF = f
        current = node
      }
    }

    if (current === goal) {
      const path: Vec2[] = []
      let node = current
      while (node !== start) {
        path.push({ x: node % map.width, y: Math.floor(node / map.width) })
        node = cameFrom.get(node) as number
      }
      return path.reverse()
    }

    open.delete(current)
    const cx = current % map.width
    const cy = Math.floor(current / map.width)

    for (const step of STEPS) {
      const nx = cx + step.x
      const ny = cy + step.y
      if (!inBounds(map, nx, ny) || !map.isWalkable(nx, ny)) continue

      const diagonal = step.x !== 0 && step.y !== 0
      if (diagonal && (!map.isWalkable(cx + step.x, cy) || !map.isWalkable(cx, cy + step.y))) {
        continue
      }

      const neighbour = key(nx, ny)
      const tentative = (gScore.get(current) as number) + (diagonal ? Math.SQRT2 : 1)
      if (tentative < (gScore.get(neighbour) ?? Infinity)) {
        cameFrom.set(neighbour, current)
        gScore.set(neighbour, tentative)
        fScore.set(neighbour, tentative + h(nx, ny))
        open.add(neighbour)
      }
    }
  }

  return null
}
