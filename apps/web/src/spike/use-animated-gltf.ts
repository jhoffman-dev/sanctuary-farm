import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import { AnimationMixer, Box3, type AnimationAction, type Group, type Object3D } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { fitToHeight } from './model-fit'

/** The spike's `.glb`s are meshopt-compressed by `gltf-transform optimize`. */
function withMeshopt(loader: GLTFLoader): void {
  loader.setMeshoptDecoder(MeshoptDecoder)
}

export type AnimatedGltf = {
  scene: Group
  mixer: AnimationMixer
  actions: ReadonlyMap<string, AnimationAction>
  /** Uniform scale and ground offset that make the model `targetHeight` tall. */
  scale: number
  offsetY: number
}

function enableShadows(root: Object3D): void {
  root.traverse((node) => {
    node.castShadow = true
    node.receiveShadow = false
  })
}

/**
 * Load one animated glTF and prepare it for playback: a mixer, its clips keyed
 * by name, and the transform that puts it on the ground at the right height.
 *
 * One model per URL — nothing here clones, so do not mount the same URL twice.
 */
export function useAnimatedGltf({ url, targetHeight }: { url: string; targetHeight: number }): AnimatedGltf {
  const gltf = useLoader(GLTFLoader, url, withMeshopt)

  return useMemo(() => {
    const scene = gltf.scene as Group
    enableShadows(scene)
    const mixer = new AnimationMixer(scene)
    const actions = new Map(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]))
    const box = new Box3().setFromObject(scene)
    const { scale, offsetY } = fitToHeight({ bounds: { minY: box.min.y, maxY: box.max.y }, targetHeight })
    return { scene, mixer, actions, scale, offsetY }
  }, [gltf, targetHeight])
}
