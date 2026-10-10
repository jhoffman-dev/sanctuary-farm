import type { Object3D } from 'three'
import type { QuarterTurns } from '@sf/world'
import { type PieceModel, quarterTurnsToRadians } from '../world-assets'

type PlacedPieceProps = {
  model: PieceModel
  /** A clone of the loaded GLB scene; this component never mutates the shared original. */
  object: Object3D
  position: readonly [number, number, number]
  /** The tile world's rotation: quarter turns clockwise seen from above, 0 = north. */
  rotation?: QuarterTurns
}

/**
 * Sits one catalogue piece on its tile: world transform, then the catalogue's
 * rotation offset, then the model's own offset and scale. Order matters — the
 * offset is in the model's frame so "rotation 0" means the same for every piece.
 */
export function PlacedPiece({ model, object, position, rotation = 0 }: PlacedPieceProps) {
  return (
    <group position={[...position]} rotation={[0, quarterTurnsToRadians(rotation), 0]}>
      <group rotation={[0, model.rotationOffset, 0]}>
        <primitive
          object={object}
          position={[model.modelOffset.x, model.yOffset, model.modelOffset.z]}
          scale={model.scale}
        />
      </group>
    </group>
  )
}
