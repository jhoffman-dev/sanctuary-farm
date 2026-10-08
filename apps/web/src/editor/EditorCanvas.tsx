import { Canvas } from '@react-three/fiber'
import {
  type ChunkCoord,
  CHUNK_SIZE,
  PIECE_IDS,
  type QuarterTurns,
  type TileCoord,
  type TileWorld,
  type TileRect,
  chunkOf,
  chunkOrigin,
  neighbouringChunks,
  tileOf,
} from '@sf/world'
import { type Dispatch, Suspense, useEffect, useMemo } from 'react'
import { GroundSurface } from '../scene/GroundSurface'
import { HORIZON_GRASS, groundHex, surfaceOf } from '../scene/ground-palette'
import { HorizonGrass, Sun } from '../scene/SceneBackdrop'
import { DPR_RANGE, FOV, SKY } from '../scene/scene-look'
import { WorldPieces } from '../scene/WorldPieces'
import { type CameraCommand, EditorControls } from './EditorControls'
import { EditorProbe } from './EditorProbe'
import type { EditorAction } from './editor-state'
import { type Ghost, type Tool, ghostFor, toolOwnsDrag } from './editor-tools'
import { GhostPiece, GhostPreload } from './GhostPiece'
import { PointerSurface } from './PointerSurface'
import { RectMarker, TileMarker } from './TileMarkers'
import { type HotspotGhost, useEditorPointer } from './use-editor-pointer'

const COLOURS = {
  hover: '#ffffff',
  selected: '#facc15',
  erase: '#ef4444',
  allowed: '#22c55e',
  refused: '#ef4444',
  land: '#ffffff',
  newLand: '#38bdf8',
  hotspot: '#f59e0b',
} as const

type EditorCanvasProps = {
  world: TileWorld
  land: readonly ChunkCoord[]
  tool: Tool
  rotation: QuarterTurns
  selected: TileCoord | null
  camera: CameraCommand
  dispatch: Dispatch<EditorAction>
  onReady: () => void
}

function chunkRect(chunk: ChunkCoord): TileRect {
  const origin = chunkOrigin(chunk)
  return { x: origin.x, z: origin.z, width: CHUNK_SIZE, depth: CHUNK_SIZE }
}

function CursorGhost({ ghost, at, onLand }: { ghost: Ghost; at: TileCoord; onLand: boolean }) {
  if (!onLand) return null
  switch (ghost.kind) {
    case 'ground':
      return <TileMarker at={at} colour={groundHex(ghost.ground)} opacity={0.7} />
    case 'piece':
      return (
        <Suspense fallback={null}>
          <GhostPiece pieceId={ghost.pieceId} at={at} rotation={ghost.rotation} />
        </Suspense>
      )
    case 'erase':
      return <TileMarker at={at} colour={COLOURS.erase} opacity={0.45} />
    case 'none':
      return null
  }
}

function LandOutlines({ land, tool, hover }: { land: readonly ChunkCoord[]; tool: Tool; hover: TileCoord | null }) {
  const offered = useMemo(() => neighbouringChunks(land), [land])
  if (tool.kind !== 'add-land') return null
  const hovered = hover && chunkOf(hover)
  return (
    <group name="land outlines">
      {land.map((chunk) => (
        <RectMarker key={`land ${chunk.cx},${chunk.cz}`} rect={chunkRect(chunk)} colour={COLOURS.land} opacity={0} />
      ))}
      {offered.map((chunk) => {
        const lit = hovered?.cx === chunk.cx && hovered.cz === chunk.cz
        return <RectMarker key={`new ${chunk.cx},${chunk.cz}`} rect={chunkRect(chunk)} colour={COLOURS.newLand} opacity={lit ? 0.35 : 0.08} />
      })}
    </group>
  )
}

function HotspotOutlines({ world, ghost }: { world: TileWorld; ghost: HotspotGhost | null }) {
  return (
    <group name="hotspot outlines">
      {world.hotspots.map((hotspot) => (
        <RectMarker key={hotspot.id} rect={hotspot.footprint} colour={COLOURS.hotspot} opacity={0.12} />
      ))}
      {ghost && <RectMarker rect={ghost.rect} colour={ghost.allowed ? COLOURS.allowed : COLOURS.refused} opacity={0.4} />}
    </group>
  )
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady])
  return null
}

/** The editor's 3D view: the same ground and pieces as the game, plus the cursor, the selection and the camera. */
export function EditorCanvas({ world, land, tool, rotation, selected, camera, dispatch, onReady }: EditorCanvasProps) {
  const { hover, hotspotGhost, handlers } = useEditorPointer({ world, tool, dispatch })
  const ghost = ghostFor(tool, rotation)

  return (
    <Canvas shadows dpr={DPR_RANGE} camera={{ position: [...camera.view.position], fov: FOV, far: 400 }} data-testid="editor-scene">
      <color attach="background" args={[SKY]} />
      <hemisphereLight args={[SKY, HORIZON_GRASS, 0.9]} />
      <Sun />
      <HorizonGrass />
      {world.chunks.map((chunk) => (
        <GroundSurface key={`${chunk.coord.cx},${chunk.coord.cz}`} chunk={chunk} surfaceOf={surfaceOf} />
      ))}
      <Suspense fallback={null}>
        <WorldPieces world={world} extraPieces={PIECE_IDS} />
        <GhostPreload />
        <ReadySignal onReady={onReady} />
      </Suspense>
      <PointerSurface {...handlers} />
      <LandOutlines land={land} tool={tool} hover={hover} />
      {tool.kind === 'move-hotspot' && <HotspotOutlines world={world} ghost={hotspotGhost} />}
      {selected && <TileMarker at={selected} colour={COLOURS.selected} opacity={0.35} />}
      {hover && <TileMarker at={hover} colour={COLOURS.hover} opacity={0.15} />}
      {hover && <CursorGhost ghost={ghost} at={hover} onLand={tileOf(world, hover) !== undefined} />}
      <EditorControls command={camera} leftDragPans={!toolOwnsDrag(tool)} />
      <EditorProbe world={world} />
    </Canvas>
  )
}
