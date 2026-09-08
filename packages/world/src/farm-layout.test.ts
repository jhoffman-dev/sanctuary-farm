/**
 * The rules docs/art-direction.md §2 states about the farm, checked against the
 * layout we actually ship. These fail the gate if someone moves the barn too
 * far, tilts a camera to top-down, or grows the world past its bounds.
 */
import { describe, expect, it } from 'vitest'
import { loadFarmLayout } from './farm-layout'
import { areaContains, areasOverlap, areaWithinGround } from './geometry'
import {
  MAX_CAMERA_ELEVATION_DEGREES,
  MAX_CROSSING_SECONDS,
  MAX_GROUND_SIZE,
  MIN_CAMERA_ELEVATION_DEGREES,
  cameraElevationDegrees,
  slowestCrossingSeconds,
} from './layout-rules'
import { HOTSPOT_IDS } from './world-layout'

const layout = loadFarmLayout()

describe('farm.json v1 — the art-direction rules', () => {
  it('parses', () => {
    expect(layout.schemaVersion).toBe(1)
  })

  it('keeps the ground within 30 × 30 units', () => {
    const [width, depth] = layout.ground.size
    expect(width).toBeLessThanOrEqual(MAX_GROUND_SIZE)
    expect(depth).toBeLessThanOrEqual(MAX_GROUND_SIZE)
  })

  it('lets the keeper walk the farthest hotspot pair in 8 s or less', () => {
    expect(slowestCrossingSeconds(layout.hotspots)).toBeLessThanOrEqual(MAX_CROSSING_SECONDS)
  })

  it('looks down on the farm from 20–35° at every camera anchor', () => {
    const anchors = [layout.camera.home, ...layout.hotspots.map((hotspot) => hotspot.cameraAnchor)]
    for (const anchor of anchors) {
      const elevation = cameraElevationDegrees(anchor)
      expect(elevation).toBeGreaterThanOrEqual(MIN_CAMERA_ELEVATION_DEGREES)
      expect(elevation).toBeLessThanOrEqual(MAX_CAMERA_ELEVATION_DEGREES)
    }
  })

  it('places each of the seven hotspots exactly once', () => {
    expect(layout.hotspots.map((hotspot) => hotspot.id).sort()).toEqual([...HOTSPOT_IDS].sort())
  })

  it('never overlaps two trigger volumes', () => {
    const overlapping = layout.hotspots.flatMap((one, index) =>
      layout.hotspots
        .slice(index + 1)
        .filter((other) => areasOverlap(one.trigger, other.trigger))
        .map((other) => `${one.id}/${other.id}`),
    )
    expect(overlapping).toEqual([])
  })

  it('keeps every hotspot footprint inside the ground', () => {
    const spilling = layout.hotspots
      .filter((hotspot) => !areaWithinGround(hotspot.footprint, layout.ground.size))
      .map((hotspot) => hotspot.id)
    expect(spilling).toEqual([])
  })

  it('stands the keeper inside the trigger they arrive at', () => {
    for (const hotspot of layout.hotspots) {
      expect(areaContains(hotspot.trigger, hotspot.arrival)).toBe(true)
    }
  })

  it('is plain serialisable data — the same layout after a structuredClone round-trip', () => {
    expect(structuredClone(layout)).toEqual(layout)
    expect(JSON.parse(JSON.stringify(layout))).toEqual(layout)
  })

  it('returns the same parsed layout on every call', () => {
    expect(loadFarmLayout()).toBe(layout)
  })
})
