import { useFrame } from '@react-three/fiber'
import type { PlacedHotspot } from '@sf/world'
import { type RefObject, useRef } from 'react'
import { Vector3 } from 'three'
import { footprintCentre } from './piece-placement'

/** How often the numbers are written out: often enough for a test, rare enough to cost nothing. */
const PUBLISH_EVERY_SECONDS = 0.5
/** Hotspot markers are checked at about knee height, where the eye finds them. */
const MARKER_HEIGHT = 0.3

type PerfProbeProps = {
  /** Written to directly, not through React state: the budget forbids a React commit inside `useFrame`. */
  target: RefObject<HTMLElement | null>
  hotspots: readonly PlacedHotspot[]
}

/**
 * `?perf=1`: puts `renderer.info`, the frame rate and each hotspot's screen
 * position onto the DOM as data attributes — the ADR-0004 spike's technique
 * for letting Playwright read a WebGL scene. Mounted with the world's models,
 * so its first write also means "the world has rendered".
 */
export function PerfProbe({ target, hotspots }: PerfProbeProps) {
  const tally = useRef({ frames: 0, seconds: 0 })
  useFrame(({ gl, camera, size }, delta) => {
    const element = target.current
    if (!element) return
    tally.current.frames += 1
    tally.current.seconds += delta
    if (tally.current.seconds < PUBLISH_EVERY_SECONDS) return
    const onScreen = hotspots.map((hotspot) => {
      const { x, z } = footprintCentre(hotspot.footprint)
      const point = new Vector3(x, MARKER_HEIGHT, z).project(camera)
      return { id: hotspot.id, left: Math.round(((point.x + 1) / 2) * size.width), top: Math.round(((1 - point.y) / 2) * size.height) }
    })
    Object.assign(element.dataset, {
      drawCalls: String(gl.info.render.calls),
      triangles: String(gl.info.render.triangles),
      fps: (tally.current.frames / tally.current.seconds).toFixed(1),
      hotspots: JSON.stringify(onScreen),
      viewport: `${size.width}x${size.height}`,
    })
    tally.current = { frames: 0, seconds: 0 }
  })
  return null
}
