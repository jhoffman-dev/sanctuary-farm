import { PIECE_IDS, type PieceId, type QuarterTurns, type TileCoord, tileCentre } from '@sf/world'
import { useEffect, useMemo } from 'react'
import { type Material, type Mesh, type Object3D } from 'three'
import { KENNEY_CATALOGUE } from '../world-assets'
import { PlacedPiece } from '../scene/PlacedPiece'
import { useKenneyModels } from '../scene/use-kenney-models'

const GHOST_OPACITY = 0.55

/**
 * Every piece's model, as one fixed loader request: the ghost asks for the
 * same list every time, so after `GhostPreload` it never suspends, whatever
 * the palette holds.
 */
const ALL_PIECE_MODELS = [...new Map(PIECE_IDS.map((pieceId) => [KENNEY_CATALOGUE[pieceId].url, KENNEY_CATALOGUE[pieceId]])).values()]

/** Loads every ghost up front, alongside the world's own pieces. */
export function GhostPreload() {
  useKenneyModels(ALL_PIECE_MODELS)
  return null
}

/** A see-through copy of a model. Its materials are its own, so the real pieces stay solid. */
function ghostOf(scene: Object3D): { object: Object3D; materials: Material[] } {
  const object = scene.clone(true)
  const materials: Material[] = []
  object.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    const ghost = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.clone()
    if (!ghost) return
    ghost.transparent = true
    ghost.opacity = GHOST_OPACITY
    ghost.depthWrite = false
    mesh.material = ghost
    mesh.castShadow = false
    materials.push(ghost)
  })
  return { object, materials }
}

/** The piece the next click would place, standing on the hovered tile. */
export function GhostPiece({ pieceId, at, rotation }: { pieceId: PieceId; at: TileCoord; rotation: QuarterTurns }) {
  const model = KENNEY_CATALOGUE[pieceId]
  const scene = useKenneyModels(ALL_PIECE_MODELS).get(model.url)
  const ghost = useMemo(() => (scene ? ghostOf(scene) : null), [scene])
  useEffect(() => () => ghost?.materials.forEach((material) => material.dispose()), [ghost])
  if (!ghost) return null
  const [x, z] = tileCentre(at)
  return <PlacedPiece model={model} object={ghost.object} position={[x, 0, z]} rotation={rotation} />
}
