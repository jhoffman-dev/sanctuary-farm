/**
 * Ground-plane geometry the layout rules need. Everything is 2D: the farm is
 * flat, so overlap, containment and walking distance are all questions about
 * `[x, z]`.
 */
import type { Area, Point2 } from './world-layout'

type Circle = Extract<Area, { shape: 'circle' }>
type Box = Extract<Area, { shape: 'box' }>

export function distance2(from: Point2, to: Point2): number {
  return Math.hypot(from[0] - to[0], from[1] - to[1])
}

/** `[halfWidth, halfDepth]` — a circle's half-extents are its radius on both axes. */
function halfExtents(area: Area): Point2 {
  return area.shape === 'circle' ? [area.radius, area.radius] : [area.size[0] / 2, area.size[1] / 2]
}

/** The point of the box nearest `point`, which is `point` itself when it is inside. */
function nearestPointInBox(box: Box, point: Point2): Point2 {
  const [halfWidth, halfDepth] = halfExtents(box)
  return [
    Math.min(Math.max(point[0], box.centre[0] - halfWidth), box.centre[0] + halfWidth),
    Math.min(Math.max(point[1], box.centre[1] - halfDepth), box.centre[1] + halfDepth),
  ]
}

/** Inclusive: a point exactly on the edge counts as inside, so a trigger's rim triggers. */
export function areaContains(area: Area, point: Point2): boolean {
  if (area.shape === 'circle') return distance2(area.centre, point) <= area.radius
  const [halfWidth, halfDepth] = halfExtents(area)
  return (
    Math.abs(point[0] - area.centre[0]) <= halfWidth && Math.abs(point[1] - area.centre[1]) <= halfDepth
  )
}

function circleTouchesBox(circle: Circle, box: Box): boolean {
  return distance2(circle.centre, nearestPointInBox(box, circle.centre)) < circle.radius
}

/**
 * Strictly overlapping: two areas that share only a boundary — a fence line
 * between two paddocks — are neighbours, not an overlap.
 */
export function areasOverlap(one: Area, other: Area): boolean {
  if (one.shape === 'circle') {
    return other.shape === 'circle'
      ? distance2(one.centre, other.centre) < one.radius + other.radius
      : circleTouchesBox(one, other)
  }
  if (other.shape === 'circle') return circleTouchesBox(other, one)
  const [oneHalfWidth, oneHalfDepth] = halfExtents(one)
  const [otherHalfWidth, otherHalfDepth] = halfExtents(other)
  return (
    Math.abs(one.centre[0] - other.centre[0]) < oneHalfWidth + otherHalfWidth &&
    Math.abs(one.centre[1] - other.centre[1]) < oneHalfDepth + otherHalfDepth
  )
}

/** Whether every part of `area` lies on a `[width, depth]` ground centred on the origin. */
export function areaWithinGround(area: Area, groundSize: Point2): boolean {
  const [halfWidth, halfDepth] = halfExtents(area)
  return (
    Math.abs(area.centre[0]) + halfWidth <= groundSize[0] / 2 &&
    Math.abs(area.centre[1]) + halfDepth <= groundSize[1] / 2
  )
}

export function pointWithinGround(point: Point2, groundSize: Point2): boolean {
  return Math.abs(point[0]) <= groundSize[0] / 2 && Math.abs(point[1]) <= groundSize[1] / 2
}
