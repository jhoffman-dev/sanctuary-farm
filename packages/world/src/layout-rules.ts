/**
 * The rules docs/art-direction.md §2 states about the world, as checks a layout
 * either passes or fails. `parseFarmLayout` runs them, so a layout that would
 * read as top-down, or that a keeper could not cross in time, cannot ship.
 */
import { areaContains, areasOverlap, areaWithinGround, distance2, pointWithinGround } from './geometry'
import type { CameraAnchor, Hotspot, Point2, WorldLayout } from './world-layout'

/** "One contiguous farm (~30 × 30 units walkable)" — art-direction §2. */
export const MAX_GROUND_SIZE = 30

/**
 * Units per second. Art-direction §2 states the farm as ~30 units across and
 * "crossing ≤ 8 s"; that pairing is the speed, and the movement ticket has to
 * honour it or the rule below means nothing.
 */
export const KEEPER_SPEED = MAX_GROUND_SIZE / 8

export const MAX_CROSSING_SECONDS = 8

export const MIN_CAMERA_ELEVATION_DEGREES = 20
export const MAX_CAMERA_ELEVATION_DEGREES = 35
export const MIN_CAMERA_FOV_DEGREES = 30
export const MAX_CAMERA_FOV_DEGREES = 40

/** How long the keeper takes to walk between two spots, ignoring what is in the way. */
export function crossingSeconds(from: Point2, to: Point2): number {
  return distance2(from, to) / KEEPER_SPEED
}

/** The walk the farm is judged on: the slowest hotspot-to-hotspot trip. */
export function slowestCrossingSeconds(hotspots: readonly Hotspot[]): number {
  let slowest = 0
  for (let i = 0; i < hotspots.length; i++) {
    for (let j = i + 1; j < hotspots.length; j++) {
      const from = hotspots[i]
      const to = hotspots[j]
      if (!from || !to) continue
      slowest = Math.max(slowest, crossingSeconds(from.arrival, to.arrival))
    }
  }
  return slowest
}

/** Degrees above the horizon, from the anchor's own position and look-at. */
export function cameraElevationDegrees(anchor: CameraAnchor): number {
  const horizontal = Math.hypot(anchor.position[0] - anchor.lookAt[0], anchor.position[2] - anchor.lookAt[2])
  return (Math.atan2(anchor.position[1] - anchor.lookAt[1], horizontal) * 180) / Math.PI
}

function groundViolations(layout: WorldLayout): string[] {
  const [width, depth] = layout.ground.size
  if (width > MAX_GROUND_SIZE || depth > MAX_GROUND_SIZE) {
    return [`ground.size: the farm is ${width} × ${depth}, over the ${MAX_GROUND_SIZE} × ${MAX_GROUND_SIZE} limit`]
  }
  return []
}

function cameraViolations(layout: WorldLayout): string[] {
  const { fov } = layout.camera
  const violations: string[] = []
  if (fov < MIN_CAMERA_FOV_DEGREES || fov > MAX_CAMERA_FOV_DEGREES) {
    violations.push(`camera.fov: ${fov}° is outside ${MIN_CAMERA_FOV_DEGREES}–${MAX_CAMERA_FOV_DEGREES}°`)
  }
  const anchors: [string, CameraAnchor][] = [['camera.home', layout.camera.home]]
  for (const hotspot of layout.hotspots) anchors.push([`hotspots.${hotspot.id}.cameraAnchor`, hotspot.cameraAnchor])
  for (const [path, anchor] of anchors) {
    const elevation = cameraElevationDegrees(anchor)
    if (elevation < MIN_CAMERA_ELEVATION_DEGREES || elevation > MAX_CAMERA_ELEVATION_DEGREES) {
      violations.push(
        `${path}: elevation ${elevation.toFixed(1)}° is outside ${MIN_CAMERA_ELEVATION_DEGREES}–${MAX_CAMERA_ELEVATION_DEGREES}°`,
      )
    }
  }
  return violations
}

function hotspotViolations(layout: WorldLayout): string[] {
  const violations: string[] = []
  for (const hotspot of layout.hotspots) {
    const where = `hotspots.${hotspot.id}`
    if (!areaWithinGround(hotspot.footprint, layout.ground.size)) {
      violations.push(`${where}.footprint: reaches past the edge of the ground`)
    }
    if (!areaContains(hotspot.trigger, hotspot.arrival)) {
      violations.push(`${where}.arrival: outside its own trigger volume`)
    }
    if (!pointWithinGround(hotspot.arrival, layout.ground.size)) {
      violations.push(`${where}.arrival: off the ground`)
    }
  }
  return violations
}

function triggerOverlapViolations(hotspots: readonly Hotspot[]): string[] {
  const violations: string[] = []
  for (let i = 0; i < hotspots.length; i++) {
    for (let j = i + 1; j < hotspots.length; j++) {
      const one = hotspots[i]
      const other = hotspots[j]
      if (!one || !other) continue
      if (areasOverlap(one.trigger, other.trigger)) {
        violations.push(`hotspots.${one.id}.trigger: overlaps hotspots.${other.id}.trigger`)
      }
    }
  }
  return violations
}

function placementViolations(layout: WorldLayout): string[] {
  const violations: string[] = []
  for (const path of layout.paths) {
    const strays = path.points.filter((point) => !pointWithinGround(point, layout.ground.size))
    if (strays.length > 0) violations.push(`paths.${path.id}.points: ${strays.length} point(s) off the ground`)
  }
  for (const group of layout.props) {
    const strays = group.instances.filter(
      (instance) => !pointWithinGround([instance.position[0], instance.position[2]], layout.ground.size),
    )
    if (strays.length > 0) violations.push(`props.${group.model}: ${strays.length} instance(s) off the ground`)
  }
  return violations
}

function crossingViolations(hotspots: readonly Hotspot[]): string[] {
  const slowest = slowestCrossingSeconds(hotspots)
  if (slowest <= MAX_CROSSING_SECONDS) return []
  return [`hotspots: the farthest pair is a ${slowest.toFixed(1)} s walk, over the ${MAX_CROSSING_SECONDS} s limit`]
}

/** Every art-direction rule the layout breaks, in reading order. Empty means the world is sound. */
export function layoutRuleViolations(layout: WorldLayout): string[] {
  return [
    ...groundViolations(layout),
    ...cameraViolations(layout),
    ...hotspotViolations(layout),
    ...triggerOverlapViolations(layout.hotspots),
    ...placementViolations(layout),
    ...crossingViolations(layout.hotspots),
  ]
}
