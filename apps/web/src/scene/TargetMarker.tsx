import type { Point2 } from '@sf/world'

/** A soft cream ring: readable on grass, path and dirt alike, and never mistaken for a hotspot marker. */
const MARKER_COLOUR = '#fff3c4'
/** Just above the ground surface, so the ring never flickers into it. */
const MARKER_HEIGHT = 0.04

/** Where a tap sent the keeper, until it gets there. */
export function TargetMarker({ at }: { at: Point2 }) {
  return (
    <mesh position={[at[0], MARKER_HEIGHT, at[1]]} rotation={[-Math.PI / 2, 0, 0]} name="target marker">
      <ringGeometry args={[0.28, 0.42, 32]} />
      <meshBasicMaterial color={MARKER_COLOUR} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  )
}
