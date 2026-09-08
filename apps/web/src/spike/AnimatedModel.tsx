import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { ClipCrossfade } from './clip-crossfade'
import { useAnimatedGltf } from './use-animated-gltf'

export const CROSSFADE_SECONDS = 0.25

type AnimatedModelProps = {
  url: string
  targetHeight: number
  /**
   * Read every frame rather than passed as a prop: the keeper's clip changes
   * with its speed, and a React commit per frame is outside the JS-per-frame
   * budget (performance-budget.md, runtime table).
   */
  clipName: () => string
  onClipChanged?: (name: string) => void
}

/**
 * One glTF model, scaled to the art-direction height, playing whichever clip
 * `clipName()` asks for and crossfading when that answer changes.
 */
export function AnimatedModel({ url, targetHeight, clipName, onClipChanged }: AnimatedModelProps) {
  const { scene, mixer, actions, scale, offsetY } = useAnimatedGltf({ url, targetHeight })
  const crossfade = useMemo(() => new ClipCrossfade({ actions, initial: clipName() }), [actions, clipName])
  const reported = useRef<string | null>(null)

  useEffect(
    () => () => {
      mixer.stopAllAction()
    },
    [mixer],
  )

  useFrame((_, delta) => {
    crossfade.fadeTo(clipName(), CROSSFADE_SECONDS)
    mixer.update(delta)
    if (crossfade.currentName !== reported.current) {
      reported.current = crossfade.currentName
      onClipChanged?.(crossfade.currentName)
    }
  })

  return <primitive object={scene} position={[0, offsetY, 0]} scale={scale} />
}
