import { useFrame } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import { AnimatedModel } from './AnimatedModel'
import { SILHOUETTE_KEY } from './silhouette'
import type { GrazerCast } from './spike-cast'

/**
 * How long each half of the loop lasts. A fixed schedule, not a random one:
 * the spike has to be reproducible for the e2e run and the FPS measurement.
 */
const IDLE_SECONDS = 4
const EATING_SECONDS = 3

/** A standing farm animal that crossfades between its two clips on a timer. */
export function Grazer({ url, name, targetHeight, position, rotationY, phaseSeconds, clips }: GrazerCast) {
  const elapsed = useRef(phaseSeconds)
  const readClip = useCallback(
    () => (elapsed.current % (IDLE_SECONDS + EATING_SECONDS) < IDLE_SECONDS ? clips.resting : clips.busy),
    [clips],
  )

  useFrame((_, delta) => {
    elapsed.current += delta
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]} userData={{ [SILHOUETTE_KEY]: name }}>
      <AnimatedModel url={url} targetHeight={targetHeight} clipName={readClip} />
    </group>
  )
}
