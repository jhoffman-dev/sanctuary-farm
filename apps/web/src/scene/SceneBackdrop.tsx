import { HORIZON_GRASS } from './ground-palette'

/** What the farm stands in — the far grass and the sun — shared by the game's scene and the world editor's. */

const HORIZON_SIZE = 200
/** Below the chunks' ground (and below water), so the land always wins. */
const HORIZON_HEIGHT = -0.2
/** The sun's shadow camera has to cover the whole farm, not three.js's default 10 × 10 units. */
const SHADOW_HALF_EXTENT = 22

export function HorizonGrass() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HORIZON_HEIGHT, 0]}>
      <planeGeometry args={[HORIZON_SIZE, HORIZON_SIZE]} />
      <meshStandardMaterial color={HORIZON_GRASS} roughness={1} />
    </mesh>
  )
}

/** `castShadow` off is the low tier: no shadow pass, about half the draw calls (ADR-0004). */
export function Sun({ castShadow = true }: { castShadow?: boolean }) {
  const half = SHADOW_HALF_EXTENT
  return (
    <directionalLight
      position={[10, 18, 8]}
      intensity={1.3}
      castShadow={castShadow}
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-half}
      shadow-camera-right={half}
      shadow-camera-top={half}
      shadow-camera-bottom={-half}
      shadow-camera-far={60}
      shadow-bias={-0.0005}
      shadow-normalBias={0.03}
    />
  )
}
