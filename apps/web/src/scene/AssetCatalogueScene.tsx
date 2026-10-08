import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, type Group, type Object3D, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { CATALOGUE_ROWS, type CatalogueCell, type CatalogueLabel, catalogueModel, layoutCatalogue } from './catalogue-grid'
import { PlacedPiece } from './PlacedPiece'
import { countColourMaps } from './texture-census'
import { useKenneyModels } from './use-kenney-models'

/** Whole tiles between cell centres: wide enough that a 2-tile cow never touches its neighbour. */
const SPACING = 3
const CAMERA_POSITION: [number, number, number] = [0, 22, 17]
const LOOK_AT: [number, number, number] = [0, 0, 1.2]
const AXIS_LENGTH = 0.8
const AXIS_THICKNESS = 0.05
/** Frames to wait before reporting, so every piece has rendered at least once. */
const SETTLE_FRAMES = 3

const CELLS = layoutCatalogue(CATALOGUE_ROWS, SPACING)
const SOURCES = CELLS.map((cell) => catalogueModel(cell.label))

type Label = { label: CatalogueLabel; left: number; top: number }
type Stats = { colourMaps: number; sizes: Record<string, [number, number, number]> }

/** A red +X and a blue +Z bar under each piece, so "rotation 0" can be judged at a glance. */
function AxisMarker() {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh position={[AXIS_LENGTH / 2, 0, 0]}>
        <boxGeometry args={[AXIS_LENGTH, AXIS_THICKNESS, AXIS_THICKNESS]} />
        <meshBasicMaterial color="#d62828" />
      </mesh>
      <mesh position={[0, 0, AXIS_LENGTH / 2]}>
        <boxGeometry args={[AXIS_THICKNESS, AXIS_THICKNESS, AXIS_LENGTH]} />
        <meshBasicMaterial color="#1d4ed8" />
      </mesh>
    </group>
  )
}

function TileOutline({ x, z }: { x: number; z: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
      <planeGeometry args={[x, z]} />
      <meshBasicMaterial color="#e7e5e4" />
    </mesh>
  )
}

type CellViewProps = { cell: CatalogueCell; object: Group; register: (label: CatalogueLabel, group: Group | null) => void }

function CatalogueCellView({ cell, object, register }: CellViewProps) {
  const model = catalogueModel(cell.label)
  return (
    <group position={[cell.x, 0, cell.z]}>
      <TileOutline x={model.footprint.x} z={model.footprint.z} />
      <AxisMarker />
      <group ref={(group) => register(cell.label, group)}>
        <PlacedPiece model={model} object={object} position={[0, 0, 0]} />
      </group>
    </group>
  )
}

function loadedScene(scenes: ReadonlyMap<string, Object3D>, url: string): Object3D {
  const scene = scenes.get(url)
  if (!scene) throw new Error(`Catalogue model was not loaded: ${url}`)
  return scene
}

/** World-space size of each placed piece, to the millimetre, for the e2e report. */
function measureSizes(pieces: ReadonlyMap<CatalogueLabel, Group>): Stats['sizes'] {
  const sizes: Stats['sizes'] = {}
  for (const [label, group] of pieces) {
    const size = new Box3().setFromObject(group).getSize(new Vector3())
    sizes[label] = [size.x, size.y, size.z].map((n) => Math.round(n * 1000) / 1000) as [number, number, number]
  }
  return sizes
}

function CatalogueContents({ onStats }: { onStats: (stats: Stats) => void }) {
  const scenes = useKenneyModels(SOURCES)
  const placed = useMemo(
    () => CELLS.map((cell) => ({ cell, object: clone(loadedScene(scenes, catalogueModel(cell.label).url)) as Group })),
    [scenes],
  )
  const pieces = useRef(new Map<CatalogueLabel, Group>())
  const frames = useRef(0)
  const register = useMemo(
    () => (label: CatalogueLabel, group: Group | null) => {
      if (group) pieces.current.set(label, group)
      else pieces.current.delete(label)
    },
    [],
  )
  useFrame(({ scene }) => {
    frames.current += 1
    if (frames.current !== SETTLE_FRAMES) return
    onStats({ colourMaps: countColourMaps(scene), sizes: measureSizes(pieces.current) })
  })
  return (
    <>
      {placed.map(({ cell, object }) => (
        <CatalogueCellView key={cell.label} cell={cell} object={object} register={register} />
      ))}
    </>
  )
}

/** Projects each cell's front edge to screen pixels so HTML labels can sit under the pieces. */
function LabelProjector({ onProject }: { onProject: (labels: Label[]) => void }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  useEffect(() => {
    camera.lookAt(...LOOK_AT)
    camera.updateMatrixWorld()
    onProject(
      CELLS.map((cell) => {
        const point = new Vector3(cell.x, 0, cell.z + 1.1).project(camera)
        return { label: cell.label, left: ((point.x + 1) / 2) * size.width, top: ((1 - point.y) / 2) * size.height }
      }),
    )
  }, [camera, size, onProject])
  return null
}

/**
 * Dev route (`?assets=1`): every catalogue piece in one scene, one per cell,
 * labelled, over its footprint, with +X/+Z axis bars. For checking the
 * catalogue by eye and by e2e; the game never renders it.
 */
export function AssetCatalogueScene() {
  const [labels, setLabels] = useState<Label[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  return (
    <div
      className="relative h-full w-full"
      data-testid="asset-catalogue"
      data-ready={stats ? 'true' : 'false'}
      data-colour-maps={stats?.colourMaps}
      data-sizes={stats ? JSON.stringify(stats.sizes) : undefined}
    >
      <Canvas camera={{ position: CAMERA_POSITION, fov: 40 }} style={{ position: 'absolute', inset: 0 }}>
        <color attach="background" args={['#f5f5f4']} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[6, 12, 8]} intensity={1.6} />
        <LabelProjector onProject={setLabels} />
        <Suspense fallback={null}>
          <CatalogueContents onStats={setStats} />
        </Suspense>
      </Canvas>
      {labels.map((label) => (
        <span
          key={label.label}
          className="pointer-events-none absolute -translate-x-1/2 rounded bg-white/85 px-1 text-[11px] font-semibold text-stone-800"
          style={{ left: label.left, top: label.top }}
        >
          {label.label}
          {catalogueModel(label.label).placeholder ? ' *' : ''}
        </span>
      ))}
    </div>
  )
}
