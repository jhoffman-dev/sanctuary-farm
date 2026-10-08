import type { Chunk, GroundPiece } from '@sf/world'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { buildGroundSurface, type Surface } from './ground-surface'

type GroundSurfaceProps = {
  chunk: Chunk
  surfaceOf: (ground: GroundPiece) => Surface
}

/** One chunk's ground: one mesh, one draw, coloured per tile. Receives shadows; casts none. */
export function GroundSurface({ chunk, surfaceOf }: GroundSurfaceProps) {
  const geometry = useMemo(() => {
    const surface = buildGroundSurface(chunk, surfaceOf)
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(surface.positions, 3))
    built.setAttribute('normal', new BufferAttribute(surface.normals, 3))
    built.setAttribute('color', new BufferAttribute(surface.colours, 3))
    built.setIndex(new BufferAttribute(surface.indices, 1))
    built.computeBoundingSphere()
    return built
  }, [chunk, surfaceOf])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  )
}
