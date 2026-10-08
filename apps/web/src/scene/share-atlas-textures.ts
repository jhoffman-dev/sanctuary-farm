import type { Material, Object3D, Texture } from 'three'
import { eachMaterial } from './each-material'

/**
 * GLTFLoader builds a fresh `Texture` per GLB even when two files point at the
 * same atlas, and three uploads each `Texture` to the GPU separately. With
 * `Cache.enabled` the decoded image is the same object for the same URL, so
 * keying by that image lets every model of a kit draw from one texture: one
 * upload per atlas instead of one per model.
 */
export class AtlasTextureRegistry {
  private readonly byImage = new Map<unknown, Texture[]>()

  /** Points every material map under `root` at the registry's texture for that image. */
  share(root: Object3D): void {
    eachMaterial(root, (material) => this.shareMap(material))
  }

  /** How many distinct textures the registry holds — one per atlas once sharing works. */
  get size(): number {
    let count = 0
    for (const textures of this.byImage.values()) count += textures.length
    return count
  }

  private shareMap(material: Material): void {
    if (!('map' in material)) return
    const map = material.map as Texture | null
    // No decoded image means nothing to compare by; merging those would glue
    // unrelated atlases together, so such a map keeps its own texture.
    if (!map || map.image == null) return
    const shared = this.canonical(map)
    if (shared === map) return
    material.map = shared
    map.dispose()
  }

  private canonical(texture: Texture): Texture {
    const image: unknown = texture.image
    const known = this.byImage.get(image) ?? []
    const match = known.find((candidate) => sameSampling(candidate, texture))
    if (match) return match
    this.byImage.set(image, [...known, texture])
    return texture
  }
}

function sameSampling(a: Texture, b: Texture): boolean {
  return (
    a.wrapS === b.wrapS &&
    a.wrapT === b.wrapT &&
    a.magFilter === b.magFilter &&
    a.minFilter === b.minFilter &&
    a.flipY === b.flipY &&
    a.colorSpace === b.colorSpace
  )
}
