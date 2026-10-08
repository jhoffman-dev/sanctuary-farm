import { useEffect, useMemo } from 'react'
import { InstancedMesh, Matrix4, type Mesh, type Object3D, Quaternion, Vector3 } from 'three'
import type { PieceFit } from '../world-assets'
import { type Placement, pieceTransform } from './piece-placement'

const UP = new Vector3(0, 1, 0)

/** Each mesh in a GLB scene, with its transform relative to the scene's root. */
function meshesOf(root: Object3D): { mesh: Mesh; local: Matrix4 }[] {
  root.updateWorldMatrix(true, true)
  const toRoot = root.matrixWorld.clone().invert()
  const meshes: { mesh: Mesh; local: Matrix4 }[] = []
  root.traverse((node) => {
    if ((node as Mesh).isMesh) meshes.push({ mesh: node as Mesh, local: toRoot.clone().multiply(node.matrixWorld) })
  })
  return meshes
}

function placementMatrix(model: PieceFit, placement: Placement): Matrix4 {
  const { position, yaw, scale } = pieceTransform(model, placement)
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromAxisAngle(UP, yaw),
    new Vector3(scale, scale, scale),
  )
}

type InstancedPiecesProps = {
  model: PieceFit
  /** The loaded GLB scene. Its geometry and materials are shared, never copied or disposed here. */
  scene: Object3D
  placements: readonly Placement[]
}

/**
 * One piece type drawn everywhere it stands: an `InstancedMesh` per mesh in
 * the GLB (Kenney's are one mesh each), so a hundred fence posts cost one draw.
 */
export function InstancedPieces({ model, scene, placements }: InstancedPiecesProps) {
  const instanced = useMemo(() => {
    const placed = placements.map((placement) => placementMatrix(model, placement))
    return meshesOf(scene).map(({ mesh, local }) => {
      const batch = new InstancedMesh(mesh.geometry, mesh.material, placed.length)
      placed.forEach((matrix, index) => batch.setMatrixAt(index, matrix.clone().multiply(local)))
      batch.castShadow = true
      batch.receiveShadow = true
      // Culling tests the instances' joint bounds, not the source mesh's.
      batch.computeBoundingSphere()
      return batch
    })
  }, [model, scene, placements])

  // The batches own only their instance buffers; the GLB's geometry and materials outlive them.
  useEffect(() => () => instanced.forEach((batch) => batch.dispose()), [instanced])

  return (
    <>
      {instanced.map((batch) => (
        <primitive key={batch.uuid} object={batch} />
      ))}
    </>
  )
}
