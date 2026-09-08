import { yawOf } from './steering'

/**
 * The fixed three-quarter camera from art-direction §2 — the same numbers the
 * Phase 1 `FarmScene` uses, repeated here so the spike stands alone.
 */
export const CAMERA_POSITION: readonly [number, number, number] = [9, 7, 12]
export const CAMERA_LOOK_AT: readonly [number, number, number] = [0, 0.6, 0]
export const CAMERA_FOV = 35

/**
 * The yaw that turns screen-relative input (up = away from the camera) into
 * world directions. Without it, "up" walks diagonally across an isometric view.
 */
export const SCREEN_TO_WORLD_YAW = yawOf({
  x: CAMERA_POSITION[0] - CAMERA_LOOK_AT[0],
  z: CAMERA_POSITION[2] - CAMERA_LOOK_AT[2],
})
