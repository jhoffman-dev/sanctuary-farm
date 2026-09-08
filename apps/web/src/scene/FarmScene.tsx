import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useReducedMotion } from '../a11y/use-reduced-motion'

const SKY = '#bfe3f5'
const GRASS = '#8fd18a'
const BARN_WALL = '#c8553d'
const BARN_ROOF = '#7a3b2e'

/** Three-quarter view from a little above: the Animal-Crossing angle. */
const CAMERA_POSITION: [number, number, number] = [9, 7, 12]
const LOOK_AT: [number, number, number] = [0, 0.6, 0]
const GROUND_SIZE = 200
/** Fog in the sky colour hides the ground plane's edge as a soft horizon. */
const FOG_NEAR = 25
const FOG_FAR = 70
/** Very slow, very slight — a breath, not a ride. */
const SWAY_RADIANS_PER_SECOND = 0.15
const SWAY_METRES = 0.35

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial color={GRASS} />
    </mesh>
  )
}

const BARN_WIDTH = 3
const BARN_HEIGHT = 2
const BARN_DEPTH = 2.5
const ROOF_HEIGHT = 1.3
/** Circumradius of the footprint so the pyramid roof overhangs every wall. */
const ROOF_RADIUS = Math.hypot(BARN_WIDTH / 2, BARN_DEPTH / 2) * 1.05

function Barn() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, BARN_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BARN_WIDTH, BARN_HEIGHT, BARN_DEPTH]} />
        <meshStandardMaterial color={BARN_WALL} />
      </mesh>
      {/* A 4-sided cone is a pyramid; rotate it so the edges align with the walls. */}
      <mesh position={[0, BARN_HEIGHT + ROOF_HEIGHT / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[ROOF_RADIUS, ROOF_HEIGHT, 4]} />
        <meshStandardMaterial color={BARN_ROOF} flatShading />
      </mesh>
    </group>
  )
}

function FarmCamera({ sway }: { sway: boolean }) {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    camera.position.set(...CAMERA_POSITION)
    camera.lookAt(...LOOK_AT)
  }, [camera])

  useFrame(({ clock }) => {
    if (!sway) return
    const [x, y, z] = CAMERA_POSITION
    camera.position.set(x + Math.sin(clock.elapsedTime * SWAY_RADIANS_PER_SECOND) * SWAY_METRES, y, z)
    camera.lookAt(...LOOK_AT)
  })

  return null
}

/** The 3D world. Renders scenery only — it knows nothing about facts or coins. */
export function FarmScene() {
  const reducedMotion = useReducedMotion()

  return (
    <Canvas
      shadows
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: CAMERA_POSITION, fov: 35 }}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, FOG_NEAR, FOG_FAR]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 12, 5]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} />
      <Ground />
      <Barn />
      <FarmCamera sway={!reducedMotion} />
    </Canvas>
  )
}
