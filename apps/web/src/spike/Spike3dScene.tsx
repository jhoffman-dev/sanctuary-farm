import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useCallback, useEffect } from 'react'
import { CAMERA_FOV, CAMERA_LOOK_AT, CAMERA_POSITION } from './camera-rig'
import { Grazer } from './Grazer'
import { Keeper } from './Keeper'
import { MeasurementPump } from './MeasurementPump'
import type { SpikeCast } from './spike-cast'
import type { SpikeSession } from './spike-session'

/** Art-direction §4 tokens, repeated so the spike does not depend on the app. */
const SKY = '#bfe3f5'
const GRASS = '#8fd18a'

/** Wider than the fog is deep, so the plane's edge never shows as a horizon. */
const GROUND_SIZE = 200
const FOG_NEAR = 25
const FOG_FAR = 70

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
 * The SF-63 spike scene: a rigged keeper you tap to move, the cast's animated
 * farm animals, and the fixed three-quarter camera from art-direction §2.
 */
export function Spike3dScene({ session, cast }: { session: SpikeSession; cast: SpikeCast }) {
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
        <Keeper cast={cast.keeper} session={session} />
        {cast.grazers.map((grazer) => (
          <Grazer key={grazer.name} {...grazer} />
        ))}
      </Suspense>
      <MeasurementPump session={session} />
    </Canvas>
  )
}
