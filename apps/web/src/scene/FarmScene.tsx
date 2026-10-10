import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { TileWorld } from '@sf/world'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useSceneFrameloop } from '../a11y/use-scene-frameloop'
import { type CameraView, devView, HOME_VIEW } from './camera-views'
import { GroundSurface } from './GroundSurface'
import { HORIZON_GRASS, surfaceOf } from './ground-palette'
import { HorizonGrass, Sun } from './SceneBackdrop'
import { DPR_RANGE, FOV, SKY } from './scene-look'
import { PerfProbe } from './PerfProbe'
import { sceneParams } from './scene-params'
import { WorldPieces } from './WorldPieces'

/** Fog in the sky colour hides the far grass's edge as a soft horizon. */
const FOG_NEAR = 35
const FOG_FAR = 90
/** Very slow, very slight — a breath, not a ride. */
const SWAY_RADIANS_PER_SECOND = 0.15
const SWAY_METRES = 0.35

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
