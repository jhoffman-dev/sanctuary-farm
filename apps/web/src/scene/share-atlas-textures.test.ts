import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { AtlasTextureRegistry } from './share-atlas-textures'
import { countColourMaps } from './texture-census'

/** A GLB as GLTFLoader hands it back: its own Texture wrapping the (cached) decoded atlas image. */
function loadedModel(image: object | null, ...extraMaterials: MeshStandardMaterial[]): Group {
  const group = new Group()
  group.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: new Texture(image) })))
  if (extraMaterials.length > 0) group.add(new Mesh(new BoxGeometry(), extraMaterials))
  return group
}

function maps(root: Group): Texture[] {
  const found: Texture[] = []
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return
    for (const material of [node.material].flat()) if (material.map) found.push(material.map)
  })
  return found
}

describe('AtlasTextureRegistry', () => {
  it('makes two models of the same kit share one Texture', () => {
    const atlas = {}
    const cow = loadedModel(atlas)
    const pig = loadedModel(atlas)
    const pigOwnTexture = maps(pig)[0]!
    const dispose = vi.spyOn(pigOwnTexture, 'dispose')
    const registry = new AtlasTextureRegistry()

    registry.share(cow)
    registry.share(pig)

    expect(maps(pig)[0]).toBe(maps(cow)[0])
    expect(dispose).toHaveBeenCalledOnce()
    expect(registry.size).toBe(1)
  })

  it('keeps models of different kits on their own textures', () => {
    const registry = new AtlasTextureRegistry()
    const cow = loadedModel({})
    const tree = loadedModel({})
    registry.share(cow)
    registry.share(tree)
    expect(maps(tree)[0]).not.toBe(maps(cow)[0])
    expect(registry.size).toBe(2)
  })

  it('does not merge maps whose image never decoded', () => {
    const registry = new AtlasTextureRegistry()
    const first = loadedModel(null)
    const second = loadedModel(null)
    registry.share(first)
    registry.share(second)
    expect(maps(second)[0]).not.toBe(maps(first)[0])
    expect(registry.size).toBe(0)
  })

  it('does not merge one image sampled two different ways', () => {
    const atlas = {}
    const smooth = loadedModel(atlas)
    const pixelated = loadedModel(atlas)
    maps(pixelated)[0]!.magFilter = NearestFilter
    const registry = new AtlasTextureRegistry()
    registry.share(smooth)
    registry.share(pixelated)
    expect(maps(pixelated)[0]).not.toBe(maps(smooth)[0])
  })

  it('shares across multi-material meshes and skips materials without a map', () => {
    const atlas = {}
    const plain = new MeshBasicMaterial()
    const fence = loadedModel(atlas, new MeshStandardMaterial({ map: new Texture(atlas) }), plain as unknown as MeshStandardMaterial)
    new AtlasTextureRegistry().share(fence)
    const [first, second] = maps(fence)
    expect(second).toBe(first)
    expect(plain.map).toBeNull()
  })
})

describe('countColourMaps', () => {
  it('counts distinct colour-map textures, before and after sharing', () => {
    const atlas = {}
    const scene = new Group()
    const cow = loadedModel(atlas)
    const pig = loadedModel(atlas)
    scene.add(cow, pig, loadedModel({}))
    expect(countColourMaps(scene)).toBe(3)
    const registry = new AtlasTextureRegistry()
    registry.share(cow)
    registry.share(pig)
    expect(countColourMaps(scene)).toBe(2)
  })
})
