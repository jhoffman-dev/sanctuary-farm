import { useFrame, useThree } from '@react-three/fiber'
import type { PlacedHotspot } from '@sf/world'
import { type RefObject, useEffect, useRef } from 'react'
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
 * so its first write also means "the world has rendered". A farm at rest on
 * demand draws nothing, so the probe asks for a frame each window to keep
 * its numbers current — what `?perf=1` costs, and only there.
 */
export function PerfProbe({ target, hotspots }: PerfProbeProps) {
  const frameloop = useThree((state) => state.frameloop)
  const invalidate = useThree((state) => state.invalidate)
  // Wall time, not the frame delta: the scene's clock caps each delta, and on demand a window is one long frame.
  const tally = useRef<{ frames: number; since: number } | null>(null)
  const publishes = useRef(0)

  useEffect(() => {
    if (frameloop !== 'demand') return
    const ticking = window.setInterval(() => invalidate(), PUBLISH_EVERY_SECONDS * 1000)
    return () => window.clearInterval(ticking)
  }, [frameloop, invalidate])

  useFrame(({ gl, camera, size }) => {
    const element = target.current
    if (!element) return
    if (!tally.current) {
      tally.current = { frames: 0, since: performance.now() }
      return
    }
    tally.current.frames += 1
    const seconds = (performance.now() - tally.current.since) / 1000
    if (seconds < PUBLISH_EVERY_SECONDS) return
    const onScreen = hotspots.map((hotspot) => {
      const { x, z } = footprintCentre(hotspot.footprint)
      const point = new Vector3(x, MARKER_HEIGHT, z).project(camera)
      return { id: hotspot.id, left: Math.round(((point.x + 1) / 2) * size.width), top: Math.round(((1 - point.y) / 2) * size.height) }
    })
    Object.assign(element.dataset, {
      drawCalls: String(gl.info.render.calls),
      triangles: String(gl.info.render.triangles),
      fps: (tally.current.frames / seconds).toFixed(1),
      frameloop,
      // Counts windows, so a test can wait for a fresh reading even when the numbers repeat.
      publishes: String(++publishes.current),
      hotspots: JSON.stringify(onScreen),
      viewport: `${size.width}x${size.height}`,
    })
    tally.current = { frames: 0, since: performance.now() }
  })
  return null
}
