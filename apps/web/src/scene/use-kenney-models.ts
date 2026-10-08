import { useLoader } from '@react-three/fiber'
import { use, useMemo } from 'react'
import { Cache, type Object3D } from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { atlasWarmUp } from './atlas-warm-up'
import { AtlasTextureRegistry } from './share-atlas-textures'

// Kenney GLBs reference their kit's atlas by URI. With the cache on, every GLB
// of a kit resolves that URI to one fetch and one decoded image, which is what
// lets the registry below collapse them to one GPU texture.
Cache.enabled = true

const atlases = new AtlasTextureRegistry()

/** Shared by every caller, so the world, the ghosts and the catalogue warm each atlas exactly once. */
const warmUp = atlasWarmUp((url) => new GLTFLoader().loadAsync(url))

export type ModelSource = { readonly url: string; readonly atlasUrl: string }

/**
 * Loads each GLB once (suspending until all arrive) and shares each kit's atlas
 * between them; each scene carries its GLB's clips in `scene.animations`. Each
 * atlas is warmed first by one GLB shared app-wide (`atlasWarmUp`): three
 * r185's ImageBitmapLoader hands `undefined` to a second caller that asks for
 * an image still in flight, so the atlas must be decoded and cached before any
 * other GLB asks for it.
 */
export function useKenneyModels(sources: readonly ModelSource[]): ReadonlyMap<string, Object3D> {
  use(warmUp.ready(sources))
  const urls = useMemo(() => [...new Set(sources.map((source) => source.url))], [sources])
  const loaded = useLoader(GLTFLoader, urls)
  return useMemo(() => {
    const scenes = new Map<string, Object3D>()
    const record = (gltfs: readonly GLTF[]) =>
      urls.forEach((url, index) => {
        // useLoader returns one result per URL, in order; a gap is a loader bug, not a state.
        const gltf = gltfs[index]
        if (!gltf) throw new Error(`GLTFLoader returned nothing for ${url}`)
        atlases.share(gltf.scene)
        // Object3D's own `animations` slot: clips travel with the scene and with every clone of it.
        gltf.scene.animations = gltf.animations
        scenes.set(url, gltf.scene)
      })
    record(loaded)
    return scenes
  }, [urls, loaded])
}
