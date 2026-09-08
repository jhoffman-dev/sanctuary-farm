import { useFrame } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import { AnimatedModel } from './AnimatedModel'
import { SILHOUETTE_KEY } from './silhouette'

/**
 * How long each half of the loop lasts. A fixed schedule, not a random one:
 * the spike has to be reproducible for the e2e run and the FPS measurement.
 */
const IDLE_SECONDS = 4
const EATING_SECONDS = 3

type GrazerProps = {
  url: string
  /** Capitalised: it becomes `data-silhouette-<name>` on the readout. */
  name: string
  targetHeight: number
  position: [number, number, number]
  rotationY: number
  /** Offset into the loop so two animals are not in lockstep. */
  phaseSeconds: number
}

/** A standing farm animal that crossfades idle ↔ eating on a timer. */
export function Grazer({ url, name, targetHeight, position, rotationY, phaseSeconds }: GrazerProps) {
  const elapsed = useRef(phaseSeconds)
  const readClip = useCallback(
    () => (elapsed.current % (IDLE_SECONDS + EATING_SECONDS) < IDLE_SECONDS ? 'Idle' : 'Eating'),
    [],
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
