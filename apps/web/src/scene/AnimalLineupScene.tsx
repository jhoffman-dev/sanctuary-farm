import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ANIMAL_SPECIES, type AnimalSpecies, KENNEY_ANIMALS } from '../world-assets'
import { HOME_VIEW, type Vec3 } from './camera-views'
import { HORIZON_GRASS } from './ground-palette'
import { IdlingModel } from './IdlingModel'
import { Sun } from './SceneBackdrop'
import { FOV, SKY } from './scene-look'
import { useKenneyModels } from './use-kenney-models'

/** Art-direction §3: 64 px is an animal's rendered size on the smallest supported device. */
const TILE = 64
/** Rendered at 4× and shrunk once, so the tile is a filtered image rather than aliased triangles. */
const RENDER = TILE * 4
/** Every animal shares one camera, so the tiles keep the §2 size differences; 2.6 units fits the cow. */
const DISTANCE = 2.6
const LOOK_AT: Vec3 = [0, 0.55, 0]

/** The game camera's line of sight (`HOME_VIEW`), moved in so one animal fills the frame. */
function lineupCameraPosition(): Vec3 {
  const offset = HOME_VIEW.position.map((value, i) => value - HOME_VIEW.lookAt[i]!)
  const length = Math.hypot(...offset)
  return offset.map((value, i) => LOOK_AT[i]! + (value / length) * DISTANCE) as unknown as Vec3
}

/** Facing the camera, as the farm stages them (`staging.ts`). */
const FACING_CAMERA = { x: 0, z: 0, rotation: 2 } as const

function Animal({ species }: { species: AnimalSpecies }) {
  const model = KENNEY_ANIMALS[species]
  const scene = useKenneyModels([model]).get(model.url)
  if (!scene) throw new Error(`${model.url} did not load`)
  return <IdlingModel model={model} scene={scene} at={FACING_CAMERA} />
}

/** Draws the first frame with the model in it, shrinks it into `tile`, then reports. */
function CopyToTile({ tile, onCopied }: { tile: HTMLCanvasElement; onCopied: () => void }) {
  const { gl, scene, camera, invalidate } = useThree()
  const copied = useRef(false)
  // `demand` frameloop: ask for the frame that has the freshly loaded model in it.
  useEffect(() => invalidate(), [invalidate])
  useFrame(() => {
    gl.render(scene, camera)
    if (copied.current) return
    const context = tile.getContext('2d')
    if (!context) throw new Error('No 2D context for the 64-px tile')
    context.imageSmoothingQuality = 'high'
    context.drawImage(gl.domElement, 0, 0, TILE, TILE)
    copied.current = true
    onCopied()
  }, 1)
  return null
}

function SpeciesTile({ species, onReady }: { species: AnimalSpecies; onReady: (species: AnimalSpecies) => void }) {
  const [tile, setTile] = useState<HTMLCanvasElement | null>(null)
  const copied = useCallback(() => onReady(species), [onReady, species])
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <canvas
        ref={setTile}
        width={TILE}
        height={TILE}
        data-species={species}
        // Shown at 2× with hard pixels: the same 64 × 64 image, easier for a person to judge.
        style={{ width: TILE * 2, height: TILE * 2, imageRendering: 'pixelated' }}
      />
      <figcaption className="text-xs font-semibold text-stone-800">{species}</figcaption>
      {tile && (
        <div style={{ position: 'fixed', left: -10_000, top: 0, width: RENDER, height: RENDER }} aria-hidden>
          <Canvas
            frameloop="demand"
            dpr={1}
            camera={{ position: [...lineupCameraPosition()], fov: FOV }}
            onCreated={({ camera }) => camera.lookAt(...LOOK_AT)}
          >
            <color attach="background" args={[HORIZON_GRASS]} />
            <hemisphereLight args={[SKY, HORIZON_GRASS, 0.9]} />
            <Sun />
            <Suspense fallback={null}>
              <Animal species={species} />
              <CopyToTile tile={tile} onCopied={copied} />
            </Suspense>
          </Canvas>
        </div>
      )}
    </figure>
  )
}

/**
 * Dev route (`?animals=1`): each animal alone, in colour, down the game
 * camera's line of sight at its §2 size, on grass, shrunk to 64 × 64 — the
 * art-direction §3 identification check. The game never renders it.
 */
export function AnimalLineupScene() {
  const [ready, setReady] = useState<ReadonlySet<AnimalSpecies>>(new Set())
  const onReady = useCallback((species: AnimalSpecies) => setReady((done) => new Set([...done, species])), [])
  return (
    <div
      data-testid="animal-lineup"
      data-ready={ready.size === ANIMAL_SPECIES.length ? 'true' : 'false'}
      className="inline-grid grid-cols-2 gap-3 bg-[#fff7e6] p-3"
    >
      {ANIMAL_SPECIES.map((species) => (
        <SpeciesTile key={species} species={species} onReady={onReady} />
      ))}
    </div>
  )
}
