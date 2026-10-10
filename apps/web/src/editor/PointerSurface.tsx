import type { ThreeEvent } from '@react-three/fiber'
import { type TileCoord, tileAt } from '@sf/world'

/** Big enough to reach any land the editor can show, with room to add more. */
const SURFACE_SIZE = 400

export type SurfacePointer = {
  readonly at: TileCoord
  readonly button: number
  readonly clientX: number
  readonly clientY: number
}

type PointerSurfaceProps = {
  onDown: (pointer: SurfacePointer) => void
  onMove: (pointer: SurfacePointer) => void
  onUp: (pointer: SurfacePointer) => void
  onLeave: () => void
}

function pointerOf(event: ThreeEvent<PointerEvent>): SurfacePointer {
  return {
    at: tileAt([event.point.x, event.point.z]),
    button: event.button,
    clientX: event.nativeEvent.clientX,
    clientY: event.nativeEvent.clientY,
  }
}

/**
 * An invisible plane at ground height that turns the cursor into a tile.
 * It is the only thing in the editor's scene with pointer handlers, so a tree
 * standing on a tile never hides the tile beneath it.
 */
export function PointerSurface({ onDown, onMove, onUp, onLeave }: PointerSurfaceProps) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
      onPointerDown={(event) => {
        if (event.button === 0) (event.target as unknown as Element).setPointerCapture(event.pointerId)
        onDown(pointerOf(event))
      }}
      onPointerMove={(event) => onMove(pointerOf(event))}
      onPointerUp={(event) => onUp(pointerOf(event))}
      onPointerLeave={onLeave}
    >
      <planeGeometry args={[SURFACE_SIZE, SURFACE_SIZE]} />
    </mesh>
  )
}
