import type { TileCoord, TileRect } from '@sf/world'
import { useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'

/** Just above the ground and the water, so markers never flicker into it. */
const MARKER_HEIGHT = 0.03

type RectMarkerProps = {
  rect: TileRect
  colour: string
  /** Fill opacity; the outline is always drawn solid. */
  opacity?: number
}

function outline(rect: TileRect): BufferGeometry {
  const { x, z, width, depth } = rect
  const corners = [x, z, x + width, z, x + width, z + depth, x, z + depth, x, z]
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      corners.flatMap((value, index) => (index % 2 === 0 ? [value, MARKER_HEIGHT] : [value])),
      3,
    ),
  )
  return geometry
}

/** A rectangle of tiles: a translucent fill and a solid outline. */
export function RectMarker({ rect, colour, opacity = 0.3 }: RectMarkerProps) {
  const line = useMemo(() => outline(rect), [rect])
  return (
    <group>
      {opacity > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rect.x + rect.width / 2, MARKER_HEIGHT, rect.z + rect.depth / 2]}>
          <planeGeometry args={[rect.width, rect.depth]} />
          <meshBasicMaterial color={colour} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      )}
      <lineLoop geometry={line}>
        <lineBasicMaterial color={colour} />
      </lineLoop>
    </group>
  )
}

export function TileMarker({ at, colour, opacity }: { at: TileCoord; colour: string; opacity?: number }) {
  const rect = useMemo(() => ({ x: at.x, z: at.z, width: 1, depth: 1 }), [at])
  return <RectMarker rect={rect} colour={colour} {...(opacity === undefined ? {} : { opacity })} />
}
