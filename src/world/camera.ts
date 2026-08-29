// Dead-zone follow camera. Pure functions — the target only drags the camera
// once it leaves the middle third of the viewport (CAMERA_DEADZONE). The offset
// is always clamped so the view never shows past the map edge; when the viewport
// is at least as large as the map on an axis, that axis is centred and locked.
import { CAMERA_DEADZONE, MAP_PX_H, MAP_PX_W } from '@/contracts'
import type { Vec2 } from '@/contracts'

export type Viewport = { w: number; h: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

function axisOffset(
  target: number,
  view: number,
  mapPx: number,
  prev: number | undefined,
): number {
  if (view >= mapPx) return (mapPx - view) / 2 // centre + lock

  const max = mapPx - view
  if (prev === undefined) return clamp(target - view / 2, 0, max)

  const dead = view * CAMERA_DEADZONE
  const lo = (view - dead) / 2
  const hi = (view + dead) / 2
  const screen = target - prev // target's position within the viewport

  let next = prev
  if (screen < lo) next = target - lo
  else if (screen > hi) next = target - hi
  return clamp(next, 0, max)
}

/**
 * Top-left pixel offset of the camera.
 * @param prev the previous offset — omit for an instant clamp-to-centre (e.g. on spawn).
 */
export function cameraOffset(targetPx: Vec2, viewport: Viewport, prev?: Vec2): Vec2 {
  return {
    x: axisOffset(targetPx.x, viewport.w, MAP_PX_W, prev?.x),
    y: axisOffset(targetPx.y, viewport.h, MAP_PX_H, prev?.y),
  }
}
