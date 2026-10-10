import { useThree } from '@react-three/fiber'
import { type TileCoord, tileAt } from '@sf/world'
import { useEffect } from 'react'
import { Plane, Vector2, Vector3 } from 'three'

const GROUND = new Plane(new Vector3(0, 1, 0), 0)

/**
 * Calls `onTap` with the tile under each tap or click on the canvas. The ray
 * meets the flat y = 0 plane rather than the meshes: the ground is flat to
 * within a few centimetres, and a plane costs no extra raycast targets.
 */
export function useGroundTaps(onTap: (tile: TileCoord) => void): void {
  const canvas = useThree((state) => state.gl.domElement)
  const camera = useThree((state) => state.camera)
  const raycaster = useThree((state) => state.raycaster)

  useEffect(() => {
    const hit = new Vector3()
    const onPointerDown = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      const pointer = new Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      // A ray pointing at the sky meets no ground; that tap means nothing.
      if (!raycaster.ray.intersectPlane(GROUND, hit)) return
      onTap(tileAt([hit.x, hit.z]))
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    return () => canvas.removeEventListener('pointerdown', onPointerDown)
  }, [canvas, camera, raycaster, onTap])
}
