import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { type HotspotId, hotspotArrivedAt, type TileCoord, type TileWorld } from '@sf/world'
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Object3D } from 'three'
import { type PieceModel, quarterTurnsToRadians } from '../world-assets'
import { useSceneFrameloop } from '../a11y/use-scene-frameloop'
import { type CameraView, devView, HOME_VIEW } from './camera-views'
import { GroundSurface } from './GroundSurface'
import { HORIZON_GRASS, surfaceOf } from './ground-palette'
import { HorizonGrass, Sun } from './SceneBackdrop'
import { DPR_RANGE, FOV, SKY } from './scene-look'
import { PerfProbe } from './PerfProbe'
import { sceneParams } from './scene-params'
import { WorldPieces } from './WorldPieces'
import { easeOffset, followOffset, followRadius } from './camera-follow'
import { Keeper } from './Keeper'
import { KeeperProbe } from './KeeperProbe'
import { KeeperTelemetry } from './keeper-telemetry'
import { type GroundPoint, standingAt } from './keeper-walk'
import type { Placement } from './piece-placement'
import { stageWorld } from './staging'

/** For the e2e probe: where each hotspot's entrance, doorstep and footprint are, so a test can tap them. */
function hotspotTiles(world: TileWorld): string {
  return JSON.stringify(
    world.hotspots.map(({ id, entrance, arrival, footprint }) => ({ id, entrance, arrival, footprint })),
  )
}

/** Fog in the sky colour hides the far grass's edge as a soft horizon. */
const FOG_NEAR = 35
const FOG_FAR = 90
/** Very slow, very slight — a breath, not a ride. */
const SWAY_RADIANS_PER_SECOND = 0.15
const SWAY_METRES = 0.35

type FarmCameraProps = {
  view: CameraView
  sway: boolean
  /** The keeper to keep in frame; null holds the view still (the dev views). */
  keeper: KeeperTelemetry | null
  reducedMotion: boolean
}

function FarmCamera({ view, sway, keeper, reducedMotion }: FarmCameraProps) {
  const camera = useThree((state) => state.camera)
  const offset = useRef<GroundPoint>({ x: 0, z: 0 })

  useEffect(() => {
    camera.position.set(...view.position)
    camera.lookAt(...view.lookAt)
  }, [camera, view])

  useFrame(({ clock, size }, delta) => {
    if (!sway && !keeper) return
    if (keeper) {
      const target = followOffset({
        keeper: keeper.position,
        centre: { x: view.lookAt[0], z: view.lookAt[2] },
        radius: followRadius(size.width / size.height),
      })
      offset.current = easeOffset({ current: offset.current, target, delta, reducedMotion })
    }
    const swayX = sway ? Math.sin(clock.elapsedTime * SWAY_RADIANS_PER_SECOND) * SWAY_METRES : 0
    const [x, y, z] = view.position
    const [lookX, lookY, lookZ] = view.lookAt
    camera.position.set(x + offset.current.x + swayX, y, z + offset.current.z)
    camera.lookAt(lookX + offset.current.x, lookY, lookZ + offset.current.z)
  })

  return null
}

type FarmSceneProps = {
  world: TileWorld
  /** The keeper has stopped on a hotspot's doorstep. What that opens is the application's call. */
  onArrive?: (hotspot: HotspotId) => void
}

const IGNORE_ARRIVAL = () => {}

/** The 3D world. Draws the `TileWorld` it is given — it knows nothing about facts or coins. */
export function FarmScene({ world, onArrive = IGNORE_ARRIVAL }: FarmSceneProps) {
  const frameloop = useSceneFrameloop()
  const reducedMotion = frameloop === 'demand'
  const params = useMemo(() => sceneParams(window.location.search, import.meta.env.DEV), [])
  const view = useMemo(() => (params.view ? devView(world, params.view) : HOME_VIEW), [params.view, world])
  const probeTarget = useRef<HTMLOutputElement>(null)
  const keeperProbeTarget = useRef<HTMLOutputElement>(null)
  const keeperStart = useMemo(() => stageWorld(world.hotspots).keeper, [world])
  const telemetry = useMemo(() => new KeeperTelemetry({ x: keeperStart.x, z: keeperStart.z }), [keeperStart])
  const onStopped = useCallback(
    (tile: TileCoord) => {
      const hotspot = hotspotArrivedAt(world, tile)
      if (hotspot) onArrive(hotspot)
    },
    [world, onArrive],
  )
  const renderKeeper = useCallback(
    ({ model, scene, at }: { model: PieceModel; scene: Object3D; at: Placement }) => (
      <Keeper
        world={world}
        model={model}
        scene={scene}
        start={standingAt({ x: at.x, z: at.z }, quarterTurnsToRadians(at.rotation))}
        reducedMotion={reducedMotion}
        telemetry={telemetry}
        onStopped={onStopped}
      />
    ),
    [world, reducedMotion, telemetry, onStopped],
  )
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
          <WorldPieces world={world} renderKeeper={renderKeeper} />
          {params.perf && <PerfProbe target={probeTarget} hotspots={world.hotspots} />}
          {params.perf && <KeeperProbe target={keeperProbeTarget} telemetry={telemetry} />}
        </Suspense>
        <FarmCamera
          view={view}
          sway={!reducedMotion && params.view === null}
          keeper={params.view === null ? telemetry : null}
          reducedMotion={reducedMotion}
        />
      </Canvas>
      {params.perf && <output ref={probeTarget} data-testid="perf-probe" hidden />}
      {params.perf && (
        <output ref={keeperProbeTarget} data-testid="keeper-probe" data-hotspot-tiles={hotspotTiles(world)} hidden />
      )}
    </>
  )
}
