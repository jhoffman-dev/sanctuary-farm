import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import { Cache, type Object3D } from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { splitByAtlas } from './split-by-atlas'
import { AtlasTextureRegistry } from './share-atlas-textures'

// Kenney GLBs reference their kit's atlas by URI. With the cache on, every GLB
// of a kit resolves that URI to one fetch and one decoded image, which is what
// lets the registry below collapse them to one GPU texture.
Cache.enabled = true

const atlases = new AtlasTextureRegistry()

export type ModelSource = { readonly url: string; readonly atlasUrl: string }

/**
 * Loads each GLB once (suspending until all arrive) and shares each kit's atlas
 * between them; each scene carries its GLB's clips in `scene.animations`. One
 * GLB per atlas loads first: three r185's ImageBitmapLoader hands `undefined`
 * to a second caller that asks for an image still in flight, so the atlas must
 * be decoded and cached before any other GLB asks for it.
 */
export function useKenneyModels(sources: readonly ModelSource[]): ReadonlyMap<string, Object3D> {
  const { first, rest } = useMemo(() => splitByAtlas(sources), [sources])
  const firstLoaded = useLoader(GLTFLoader, first)
  const restLoaded = useLoader(GLTFLoader, rest)
  return useMemo(() => {
    const scenes = new Map<string, Object3D>()
    const record = (urls: readonly string[], gltfs: readonly GLTF[]) =>
      urls.forEach((url, index) => {
        // useLoader returns one result per URL, in order; a gap is a loader bug, not a state.
        const gltf = gltfs[index]
        if (!gltf) throw new Error(`GLTFLoader returned nothing for ${url}`)
        atlases.share(gltf.scene)
        // Object3D's own `animations` slot: clips travel with the scene and with every clone of it.
        gltf.scene.animations = gltf.animations
        scenes.set(url, gltf.scene)
      })
    record(first, firstLoaded)
    record(rest, restLoaded)
    return scenes
  }, [first, rest, firstLoaded, restLoaded])
}
