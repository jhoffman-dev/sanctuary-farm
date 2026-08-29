// STUB — Track C replaces with real A* (diagonals only when both orthogonals clear).
import type { FindPath } from '@/contracts'

export const findPath: FindPath = (map, _from, to) => {
  if (!map.isWalkable(to.x, to.y)) return null
  // Trivial straight-line stub: one waypoint at the destination.
  return [{ x: to.x, y: to.y }]
}
