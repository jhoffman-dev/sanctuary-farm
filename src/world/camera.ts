// STUB — Track C replaces with the real dead-zone follow camera.
import { MAP_PX_H, MAP_PX_W } from '@/contracts'
import type { Vec2 } from '@/contracts'

export type Viewport = { w: number; h: number }

/** Returns the top-left pixel offset of the camera given the target's pixel pos.
 *  STUB: hard clamp, no dead zone yet (Track C adds CAMERA_DEADZONE handling). */
export function cameraOffset(targetPx: Vec2, viewport: Viewport): Vec2 {
  const x = Math.max(0, Math.min(targetPx.x - viewport.w / 2, MAP_PX_W - viewport.w))
  const y = Math.max(0, Math.min(targetPx.y - viewport.h / 2, MAP_PX_H - viewport.h))
  return {
    x: MAP_PX_W <= viewport.w ? (MAP_PX_W - viewport.w) / 2 : x,
    y: MAP_PX_H <= viewport.h ? (MAP_PX_H - viewport.h) / 2 : y,
  }
}
