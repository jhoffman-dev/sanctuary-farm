import { Box3, Vector3, type Camera, type Object3D } from 'three'
import { ndcHeightToPixels } from './screen-size'

/** Objects opt into the measurement by carrying this key in `userData`. */
export const SILHOUETTE_KEY = 'silhouetteName'

const corner = new Vector3()

/**
 * The on-screen height, in CSS pixels, of every object tagged with a
 * `silhouetteName`. Measured from the projected corners of its world bounding
 * box, so it follows the model as it walks towards or away from the camera.
 */
export function silhouetteHeights({
  scene,
  camera,
  viewportHeightPx,
}: {
  scene: Object3D
  camera: Camera
  viewportHeightPx: number
}): Record<string, number> {
  const heights: Record<string, number> = {}
  scene.traverse((node) => {
    const name = node.userData[SILHOUETTE_KEY]
    if (typeof name !== 'string') return
    const box = new Box3().setFromObject(node)
    if (box.isEmpty()) return

    let top = Number.NEGATIVE_INFINITY
    let bottom = Number.POSITIVE_INFINITY
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).project(camera)
          top = Math.max(top, corner.y)
          bottom = Math.min(bottom, corner.y)
        }
      }
    }
    heights[name] = Math.round(ndcHeightToPixels(top - bottom, viewportHeightPx))
  })
  return heights
}
