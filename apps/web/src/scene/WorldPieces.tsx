import type { PieceId, TileWorld } from '@sf/world'
import { useMemo } from 'react'
import type { Object3D } from 'three'
import { KENNEY_ANIMALS, KENNEY_CATALOGUE, KENNEY_KEEPERS, type PieceModel } from '../world-assets'
import { IdlingModel } from './IdlingModel'
import { InstancedPieces } from './InstancedPieces'
import { groupPieces, hotspotMarkers, type PieceGroup } from './piece-placement'
import { stageWorld } from './staging'
import { useKenneyModels } from './use-kenney-models'

/** One keeper for now; choosing among the four Mini Characters belongs to a later ticket. */
const KEEPER = KENNEY_KEEPERS['female-a']
const NO_EXTRA_PIECES: readonly PieceId[] = []

function loadedScene(scenes: ReadonlyMap<string, Object3D>, model: PieceModel): Object3D {
  const scene = scenes.get(model.url)
  if (!scene) throw new Error(`Model was not loaded: ${model.url}`)
  return scene
}

/** Sorted, so the same set of models is always the same loader request and never suspends again. */
function uniqueSources(models: readonly PieceModel[]): PieceModel[] {
  return [...new Map(models.map((model) => [model.url, model])).values()].sort((one, other) =>
    one.url < other.url ? -1 : 1,
  )
}

function PieceGroups({ groups, scenes }: { groups: readonly PieceGroup[]; scenes: ReadonlyMap<string, Object3D> }) {
  return (
    <>
      {groups.map(({ pieceId, placements }) => (
        <InstancedPieces
          key={pieceId}
          model={KENNEY_CATALOGUE[pieceId]}
          scene={loadedScene(scenes, KENNEY_CATALOGUE[pieceId])}
          placements={placements}
        />
      ))}
    </>
  )
}

/**
 * Everything the world stands up on its ground: one instanced draw per piece
 * type for the whole world, the hotspot markers, and the animals and keeper,
 * idling. Draws exactly what the `TileWorld` says — it decides nothing.
 */
type WorldPiecesProps = {
  world: TileWorld
  /**
   * Pieces to load even though the world has none yet. The world editor
   * passes every piece, so placing a new kind never suspends the scene.
   */
  extraPieces?: readonly PieceId[]
}

export function WorldPieces({ world, extraPieces = NO_EXTRA_PIECES }: WorldPiecesProps) {
  const pieces = useMemo(() => groupPieces(world.chunks), [world])
  const markers = useMemo(() => hotspotMarkers(world.hotspots), [world])
  const staging = useMemo(() => stageWorld(world.hotspots), [world])
  const sources = useMemo(() => {
    const pieceIds = new Set<PieceId>([...[...pieces, ...markers].map((group) => group.pieceId), ...extraPieces])
    const animals = staging.animals.map((animal) => KENNEY_ANIMALS[animal.species])
    return uniqueSources([...[...pieceIds].map((pieceId) => KENNEY_CATALOGUE[pieceId]), ...animals, KEEPER])
  }, [pieces, markers, staging, extraPieces])
  const scenes = useKenneyModels(sources)

  return (
    <>
      <group name="tile pieces">
        <PieceGroups groups={pieces} scenes={scenes} />
      </group>
      <group name="hotspot markers">
        <PieceGroups groups={markers} scenes={scenes} />
      </group>
      {staging.animals.map((animal) => (
        <IdlingModel
          key={animal.species}
          model={KENNEY_ANIMALS[animal.species]}
          scene={loadedScene(scenes, KENNEY_ANIMALS[animal.species])}
          at={animal}
        />
      ))}
      <IdlingModel model={KEEPER} scene={loadedScene(scenes, KEEPER)} at={staging.keeper} />
    </>
  )
}
