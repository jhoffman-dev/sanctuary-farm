import { useFrame } from '@react-three/fiber'
import { type TileCoord, tileAt } from '@sf/world'
import { type RefObject, useRef } from 'react'
import { Matrix4 } from 'three'
import type { KeeperTelemetry } from './keeper-telemetry'

/** Often enough to watch a walk tile by tile, rare enough to cost nothing. */
const PUBLISH_EVERY_SECONDS = 0.1

type KeeperProbeProps = {
  /** Written to directly, not through React state: no React commit inside `useFrame`. */
  target: RefObject<HTMLElement | null>
  telemetry: KeeperTelemetry
}

function rounded(value: number): string {
  return value.toFixed(3)
}

function tileText(tile: TileCoord | null): string {
  return tile ? `${tile.x},${tile.z}` : ''
}

/**
 * `?perf=1`: puts the keeper's position, facing, tile, clip, pose (radians
 * off her bind pose), destination and any "can't get there" cue on the DOM, with the camera's ground
 * position and view-projection matrix so a browser test can turn a tile into
 * a point to tap — how Playwright reads a WebGL scene (ADR-0004).
 */
export function KeeperProbe({ target, telemetry }: KeeperProbeProps) {
  const sinceLast = useRef(0)
  const lastPublished = useRef('')
  const viewProjection = useRef(new Matrix4())
  useFrame(({ camera, size }, delta) => {
    const element = target.current
    if (!element) return
    sinceLast.current += delta
    const { position, destination, clip, clipsSeen, yaw, cue, cuesShown, pose } = telemetry
    const tile = tileAt([position.x, position.z])
    // A change of tile, clip, destination, cue or (coarse) facing is published at
    // once: under reduced motion the loop draws on demand, and the frame that
    // arrives or finishes turning may be the last.
    const signature = `${tile.x},${tile.z}|${clip}|${tileText(destination)}|${tileText(cue)}|${cuesShown}|${yaw.toFixed(1)}`
    if (sinceLast.current < PUBLISH_EVERY_SECONDS && signature === lastPublished.current) return
    sinceLast.current = 0
    lastPublished.current = signature
    viewProjection.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    Object.assign(element.dataset, {
      x: rounded(position.x),
      z: rounded(position.z),
      tile: `${tile.x},${tile.z}`,
      clip,
      clipsSeen: clipsSeen.join(','),
      destination: tileText(destination),
      yaw: rounded(yaw),
      pose: rounded(pose),
      cue: tileText(cue),
      cuesShown: String(cuesShown),
      camera: `${rounded(camera.position.x)},${rounded(camera.position.z)}`,
      viewProjection: JSON.stringify(viewProjection.current.elements.map((value) => Number(value.toFixed(6)))),
      viewport: `${size.width}x${size.height}`,
    })
  })
  return null
}
