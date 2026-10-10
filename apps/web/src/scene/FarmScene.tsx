import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { TileWorld } from '@sf/world'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useSceneFrameloop } from '../a11y/use-scene-frameloop'
import { type CameraView, devView, HOME_VIEW } from './camera-views'
import { GroundSurface } from './GroundSurface'
import { HORIZON_GRASS, surfaceOf } from './ground-palette'
import { PerfProbe } from './PerfProbe'
import { sceneParams } from './scene-params'
import { WorldPieces } from './WorldPieces'

const SKY = '#bfe3f5'
const FOV = 35
/** Fog in the sky colour hides the far grass's edge as a soft horizon. */
const FOG_NEAR = 35
const FOG_FAR = 90
const HORIZON_SIZE = 200
/** Below the chunks' ground (and below water), so the land always wins. */
const HORIZON_HEIGHT = -0.2
/** Very slow, very slight — a breath, not a ride. */
const SWAY_RADIANS_PER_SECOND = 0.15
const SWAY_METRES = 0.35
/** Performance budget: devicePixelRatio is capped at 1.5 on every tier. */
const DPR_RANGE: [number, number] = [1, 1.5]
/** The sun's shadow camera has to cover the whole farm, not three.js's default 10 × 10 units. */
const SHADOW_HALF_EXTENT = 22

function HorizonGrass() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HORIZON_HEIGHT, 0]}>
      <planeGeometry args={[HORIZON_SIZE, HORIZON_SIZE]} />
      <meshStandardMaterial color={HORIZON_GRASS} roughness={1} />
    </mesh>
  )
}

function FarmCamera({ view, sway }: { view: CameraView; sway: boolean }) {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    camera.position.set(...view.position)
    camera.lookAt(...view.lookAt)
  }, [camera, view])

  useFrame(({ clock }) => {
    if (!sway) return
    const [x, y, z] = view.position
    camera.position.set(x + Math.sin(clock.elapsedTime * SWAY_RADIANS_PER_SECOND) * SWAY_METRES, y, z)
    camera.lookAt(...view.lookAt)
  })

  return null
}

function Sun() {
  const half = SHADOW_HALF_EXTENT
  return (
    <directionalLight
      position={[10, 18, 8]}
      intensity={1.3}
      castShadow
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

/** The 3D world. Draws the `TileWorld` it is given — it knows nothing about facts or coins. */
export function FarmScene({ world }: { world: TileWorld }) {
  const frameloop = useSceneFrameloop()
  const params = useMemo(() => sceneParams(window.location.search, import.meta.env.DEV), [])
  const view = useMemo(() => (params.view ? devView(world, params.view) : HOME_VIEW), [params.view, world])
  const probeTarget = useRef<HTMLOutputElement>(null)
  // A dev view looks from much further out than the game's camera; fog there would grey out the farm.
  const foggy = params.view === null

  return (
    <>
      <Canvas
        shadows
        dpr={DPR_RANGE}
        frameloop={frameloop}
        camera={{ position: [...view.position], fov: FOV, far: 200 }}
        style={{ position: 'absolute', inset: 0 }}
        aria-hidden
        // On the container div, so an e2e run can see which loop is running
        // without reaching into WebGL.
        data-testid="scene"
        data-frameloop={frameloop}
      >
        <color attach="background" args={[SKY]} />
        {foggy && <fog attach="fog" args={[SKY, FOG_NEAR, FOG_FAR]} />}
        <hemisphereLight args={[SKY, HORIZON_GRASS, 0.9]} />
        <Sun />
        <HorizonGrass />
        {world.chunks.map((chunk) => (
          <GroundSurface key={`${chunk.coord.cx},${chunk.coord.cz}`} chunk={chunk} surfaceOf={surfaceOf} />
        ))}
        <Suspense fallback={null}>
          <WorldPieces world={world} />
          {params.perf && <PerfProbe target={probeTarget} hotspots={world.hotspots} />}
        </Suspense>
        <FarmCamera view={view} sway={frameloop === 'always' && params.view === null} />
      </Canvas>
      {params.perf && <output ref={probeTarget} data-testid="perf-probe" hidden />}
    </>
  )
}
