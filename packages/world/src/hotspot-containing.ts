import { areaContains } from './geometry'
import type { Hotspot, Point2, WorldLayout } from './world-layout'

/**
 * Which hotspot the keeper has arrived at, standing on `point`, or `null` out in
 * the open. Trigger volumes never overlap (`layoutRuleViolations` enforces it),
 * so at most one can answer.
 */
export function hotspotContaining(layout: WorldLayout, point: Point2): Hotspot | null {
  return layout.hotspots.find((hotspot) => areaContains(hotspot.trigger, point)) ?? null
}
