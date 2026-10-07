import { useFrame } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import type { Group } from 'three'
import { AnimatedModel } from './AnimatedModel'
import { SCREEN_TO_WORLD_YAW } from './camera-rig'
import { SILHOUETTE_KEY } from './silhouette'
import type { KeeperCast } from './spike-cast'
import type { SpikeSession } from './spike-session'
import { advance, clipForSpeed, desiredVelocity, rotateAroundY, turnToward, yawOf, type GroundVector, type LocomotionClip } from './steering'
import { useKeyboardDirection } from './use-keyboard-direction'

/** Art-direction §2: crossing a ~30-unit farm in ≤ 8 s. */
const WALK_SPEED = 1.9
const TURN_RADIANS_PER_SECOND = 9
const ARRIVE_RADIUS = 0.08
/** Below this the walk cycle would foot-slide, so it reads as standing still. */
const WALK_SPEED_THRESHOLD = 0.05

/**
 * The tap-to-move keeper: walks to the last tapped point, turns to face where
 * it is going, and crossfades idle ↔ walk on its own speed.
 */
export function Keeper({ cast, session }: { cast: KeeperCast; session: SpikeSession }) {
  const group = useRef<Group>(null)
  const keyboard = useKeyboardDirection()
  const clip = useRef<LocomotionClip>('Idle')
  // The session reports the locomotion state; the model is asked for its own spelling of it.
  const readClip = useCallback(() => cast.clips[clip.current], [cast])

  useFrame((_, delta) => {
    const node = group.current
    if (!node) return

    const position: GroundVector = { x: node.position.x, z: node.position.z }
    const held = keyboard.current
    const velocity = desiredVelocity({
      position,
      target: session.target,
      keyboard: held ? rotateAroundY(held, SCREEN_TO_WORLD_YAW) : null,
      speed: WALK_SPEED,
      arriveRadius: ARRIVE_RADIUS,
      delta,
    })

    const speed = Math.hypot(velocity.x, velocity.z)
    if (speed > 0) {
      const next = advance({ position, velocity, delta })
      node.position.set(next.x, 0, next.z)
      node.rotation.y = turnToward({
        current: node.rotation.y,
        desired: yawOf(velocity),
        maxTurn: TURN_RADIANS_PER_SECOND * delta,
      })
    } else if (session.target) {
      // Arrived: drop the target so a keypress is not immediately overridden.
      session.arrived()
    }

    clip.current = clipForSpeed(speed, WALK_SPEED_THRESHOLD)
    session.reportKeeper({ x: node.position.x, z: node.position.z, clip: clip.current })
  })

  return (
    <group ref={group} userData={{ [SILHOUETTE_KEY]: 'Keeper' }}>
      <AnimatedModel url={cast.url} targetHeight={cast.targetHeight} clipName={readClip} />
    </group>
  )
}
