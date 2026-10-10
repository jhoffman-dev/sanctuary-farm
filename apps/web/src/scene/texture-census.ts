import type { Object3D, Texture } from 'three'
import { eachMaterial } from './each-material'

/** Distinct `Texture` objects used as a material colour map under `root`: one per kit atlas when sharing works. */
export function countColourMaps(root: Object3D): number {
  const maps = new Set<Texture>()
  eachMaterial(root, (material) => {
    if ('map' in material && material.map) maps.add(material.map as Texture)
  })
  return maps.size
}
