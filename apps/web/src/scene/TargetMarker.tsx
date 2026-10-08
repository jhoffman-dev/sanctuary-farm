import { useFrame, useThree } from '@react-three/fiber'
import type { Point2 } from '@sf/world'
import { type Ref, useRef } from 'react'
import type { Group, MeshBasicMaterial } from 'three'
import { HOME_VIEW } from './camera-views'
import { cameraForward } from './keyboard-step'
import {
  RING_CORE,
  RING_CORE_RADII,
  RING_OUTLINE,
  RING_OUTLINE_RADII,
  cueFrameSeconds,
  screenRight,
  unreachableCueLook,
} from './target-ring'

/** Just above the ground surface, so the ring never flickers into it. */
const MARKER_HEIGHT = 0.04
const SEGMENTS = 40
/** The cue shakes along the screen's left-right; following only slides the camera, never turns it. */
const SHAKE_AXIS = screenRight(cameraForward(HOME_VIEW))

type RingMaterials = {
  outline?: Ref<MeshBasicMaterial>
  core?: Ref<MeshBasicMaterial>
}

/** The two flat bands, centred on the group's origin. Drawn in order, core over outline, so they never z-fight. */
function TargetRing({ outline, core }: RingMaterials) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={1}>
        <ringGeometry args={[...RING_OUTLINE_RADII, SEGMENTS]} />
        <meshBasicMaterial ref={outline ?? null} color={RING_OUTLINE} transparent depthWrite={false} />
      </mesh>
      <mesh renderOrder={2}>
        <ringGeometry args={[...RING_CORE_RADII, SEGMENTS]} />
        <meshBasicMaterial ref={core ?? null} color={RING_CORE} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Where a tap sent the keeper, until it gets there. */
export function TargetMarker({ at }: { at: Point2 }) {
  return (
    <group position={[at[0], MARKER_HEIGHT, at[1]]} name="target marker">
      <TargetRing />
    </group>
  )
}

type UnreachableCueProps = {
  at: Point2
  reducedMotion: boolean
  /** The cue has faded out; called once. */
  onDone: () => void
}

/**
 * A tap the keeper cannot reach: the ring appears on the tapped tile and
 * fades out with a small shake (a plain fade under reduced motion). No sound,
 * no red, no words — "not there", never "wrong" (game rule 6). Animated by
 * writing to the meshes, not React state: no commit per frame.
 */
export function UnreachableCue({ at, reducedMotion, onDone }: UnreachableCueProps) {
  const group = useRef<Group>(null)
  const outline = useRef<MeshBasicMaterial>(null)
  const core = useRef<MeshBasicMaterial>(null)
  const elapsed = useRef(0)
  const finished = useRef(false)
  const invalidate = useThree((state) => state.invalidate)

  useFrame((_, delta) => {
    if (finished.current) return
    elapsed.current += cueFrameSeconds(delta)
    const look = unreachableCueLook(elapsed.current, reducedMotion)
    if (!look) {
      finished.current = true
      onDone()
      return
    }
    group.current?.position.set(at[0] + SHAKE_AXIS.x * look.shake, MARKER_HEIGHT, at[1] + SHAKE_AXIS.z * look.shake)
    for (const material of [outline.current, core.current]) if (material) material.opacity = look.opacity
    // An on-demand loop (reduced motion) draws only when asked; keep asking until the fade ends.
    invalidate()
  })

  return (
    <group ref={group} position={[at[0], MARKER_HEIGHT, at[1]]} name="unreachable cue">
      <TargetRing outline={outline} core={core} />
    </group>
  )
}
