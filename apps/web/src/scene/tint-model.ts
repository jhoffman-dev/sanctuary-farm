import { Color, type Object3D } from 'three'
import { eachMaterial } from './each-material'

/**
 * Sets every material colour under `root` to `tint` (sRGB hex). three multiplies
 * `material.color` into the atlas texel, so a Kenney GLB is recoloured at load
 * while its file and its kit's shared atlas stay untouched (ADR-0003: no
 * conversions). Setting, not multiplying, keeps a second call harmless.
 */
export function tintModel(root: Object3D, tint: string): void {
  eachMaterial(root, (material) => {
    const color: unknown = 'color' in material ? material.color : undefined
    // The catalogue promised this colour; a material that cannot carry it is a broken asset, not a choice.
    if (!(color instanceof Color)) throw new Error(`Cannot tint ${material.type} "${material.name}": it has no colour`)
    color.set(tint)
  })
}
