import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AnimationMixer, type Object3D } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { PieceModel } from '../world-assets'
import { findIdleClip } from './idle-clip'
import type { Placement } from './piece-placement'
import { PlacedPiece } from './PlacedPiece'

type IdlingModelProps = {
  model: PieceModel
  /** The loaded GLB scene; this component draws its own clone, so the original stays untouched. */
  scene: Object3D
  at: Placement
  /** Play the idle clip; off holds the pose (the low tier, so a still farm can stop drawing). */
  animate?: boolean
}

/**
 * An animal or the keeper standing still and breathing: its own copy of the
 * model playing the `idle` clip. With `animate` off it holds the clip's
 * first frame, whatever frames the loop happens to draw.
 */
export function IdlingModel({ model, scene, at, animate = true }: IdlingModelProps) {
  // SkeletonUtils, not Object3D.clone: the keeper is skinned, and a plain clone would share its skeleton.
  const object = useMemo(() => {
    const copy = clone(scene)
    copy.traverse((node) => {
      node.castShadow = true
    })
    return copy
  }, [scene])
  const mixer = useMemo(() => new AnimationMixer(object), [object])

  useEffect(() => {
    const idle = findIdleClip(object.animations)
    if (!idle) throw new Error(`${model.url} has no idle clip`)
    const action = mixer.clipAction(idle).play()
    return () => {
      action.stop()
      mixer.uncacheRoot(object)
    }
  }, [mixer, object, model.url])

  useFrame((_, delta) => mixer.update(animate ? delta : 0))

  return <PlacedPiece model={model} object={object} position={[at.x, 0, at.z]} rotation={at.rotation} />
}
