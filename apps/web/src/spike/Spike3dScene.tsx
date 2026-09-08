import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useCallback, useEffect } from 'react'
import { CAMERA_FOV, CAMERA_LOOK_AT, CAMERA_POSITION } from './camera-rig'
import { Grazer } from './Grazer'
import { Keeper } from './Keeper'
import { MeasurementPump } from './MeasurementPump'
import type { SpikeSession } from './spike-session'

/** Art-direction §4 tokens, repeated so the spike does not depend on the app. */
const SKY = '#bfe3f5'
const GRASS = '#8fd18a'

/** Wider than the fog is deep, so the plane's edge never shows as a horizon. */
const GROUND_SIZE = 200
const FOG_NEAR = 25
const FOG_FAR = 70

/** Art-direction §2 scale rule: chicken 0.5, cow 1.3, horse a shade taller. */
const CHICKEN_HEIGHT = 0.5
const COW_HEIGHT = 1.3
const HORSE_HEIGHT = 1.5

const MODELS = {
  keeper: '/spike/keeper.glb',
  cow: '/spike/cow.glb',
  horse: '/spike/horse.glb',
  chicken: '/spike/chicken.glb',
} as const

const NATURALISTIC_CLIPS = { resting: 'Idle', busy: 'Eating' } as const
/** The chunky "cute" line prefixes every clip with its armature's name. */
const CUTE_CLIPS = { resting: 'CharacterArmature|Idle', busy: 'CharacterArmature|Walk' } as const

function FixedCamera() {
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    camera.position.set(...CAMERA_POSITION)
    camera.lookAt(...CAMERA_LOOK_AT)
  }, [camera])
  return null
}

function Ground({ session }: { session: SpikeSession }) {
  const handle = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      session.walkTo({ x: event.point.x, z: event.point.z })
    },
    [session],
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={handle}>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial color={GRASS} />
    </mesh>
  )
}

/**
 * The SF-63 spike scene: a rigged keeper you tap to move, two animated farm
 * animals, and the fixed three-quarter camera from art-direction §2.
 */
export function Spike3dScene({ session }: { session: SpikeSession }) {
  return (
    <Canvas
      shadows
      camera={{ position: [...CAMERA_POSITION], fov: CAMERA_FOV }}
      style={{ position: 'absolute', inset: 0 }}
      data-testid="spike-canvas"
    >
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, FOG_NEAR, FOG_FAR]} />
      <hemisphereLight args={[SKY, GRASS, 0.75]} />
      <directionalLight position={[6, 12, 5]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} />
      <FixedCamera />
      <Ground session={session} />
      <Suspense fallback={null}>
        <Keeper url={MODELS.keeper} session={session} />
        <Grazer
          url={MODELS.cow}
          name="Cow"
          targetHeight={COW_HEIGHT}
          position={[-3.5, 0, -1]}
          rotationY={1.1}
          phaseSeconds={0}
          clips={NATURALISTIC_CLIPS}
        />
        <Grazer
          url={MODELS.horse}
          name="Horse"
          targetHeight={HORSE_HEIGHT}
          position={[3.2, 0, -2.4]}
          rotationY={-0.8}
          phaseSeconds={2.5}
          clips={NATURALISTIC_CLIPS}
        />
        {/* Deliberately from Quaternius' other, chunky line: the ADR-0003
            style comparison is the point of having it in frame. */}
        <Grazer
          url={MODELS.chicken}
          name="Chicken"
          targetHeight={CHICKEN_HEIGHT}
          position={[0.9, 0, 1.6]}
          rotationY={-2.2}
          phaseSeconds={1.2}
          clips={CUTE_CLIPS}
        />
      </Suspense>
      <MeasurementPump session={session} />
    </Canvas>
  )
}
