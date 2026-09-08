import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Texture, type Mesh, type Object3D } from 'three'
import { silhouetteHeights } from './silhouette'
import type { SpikeSession } from './spike-session'
import { estimateTextureBytes, type TextureSize } from './texture-memory'

/** How often the numbers reach the DOM. Every frame would be its own cost. */
const PUBLISH_INTERVAL_SECONDS = 0.2

function textureSizes(root: Object3D): TextureSize[] {
  const seen = new Set<Texture>()
  const sizes: TextureSize[] = []
  root.traverse((node) => {
    const material = (node as Mesh).material
    if (!material) return
    for (const one of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(one as unknown as Record<string, unknown>)) {
        if (!(value instanceof Texture) || seen.has(value)) continue
        seen.add(value)
        const image = value.image as { width?: number; height?: number } | undefined
        if (image?.width && image.height) sizes.push({ width: image.width, height: image.height })
      }
    }
  })
  return sizes
}

/** Reads `renderer.info` and the frame clock and hands them to the session. */
export function MeasurementPump({ session }: { session: SpikeSession }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const viewportHeightPx = useThree((state) => state.size.height)
  const sincePublish = useRef(0)

  useFrame((_, delta) => {
    session.recordFrame(delta, performance.now())

    sincePublish.current += delta
    if (sincePublish.current < PUBLISH_INTERVAL_SECONDS) return
    sincePublish.current = 0

    session.publish({
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      textureCount: gl.info.memory.textures,
      geometries: gl.info.memory.geometries,
      programs: gl.info.programs?.length ?? 0,
      textureBytes: estimateTextureBytes(textureSizes(scene)),
      silhouettePx: silhouetteHeights({ scene, camera, viewportHeightPx }),
    })
  })

  return null
}
