import { type Material, Mesh, type Object3D } from 'three'

/** Calls `visit` for every material of every mesh under `root`, multi-material meshes included. */
export function eachMaterial(root: Object3D, visit: (material: Material) => void): void {
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return
    const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material]
    materials.forEach(visit)
  })
}
