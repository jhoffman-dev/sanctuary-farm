import { useFrame, useThree } from '@react-three/fiber'
import { KEEPER_SPEED, type TileCoord, type TileWorld, planWalk, tileAt, tileCentre } from '@sf/world'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimationMixer, type Group, type Object3D } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { PieceModel } from '../world-assets'
import { HOME_VIEW } from './camera-views'
import { ClipCrossfade } from './clip-crossfade'
import { findClipNamed } from './idle-clip'
import { clipFor, followRoute, type KeeperWalk, stepWalk } from './keeper-walk'
import type { KeeperTelemetry } from './keeper-telemetry'
import { cameraForward, heldDirection, routeForKeys } from './keyboard-step'
import { PlacedPiece } from './PlacedPiece'
import { TargetMarker } from './TargetMarker'
import { useGroundTaps } from './use-ground-taps'
import { useHeldKeys } from './use-held-keys'

type KeeperProps = {
  world: TileWorld
  model: PieceModel
  /** The loaded GLB scene; the keeper draws its own skinned clone. */
  scene: Object3D
  start: KeeperWalk
  reducedMotion: boolean
  /** Told every frame, for the camera and the probe. */
  telemetry: KeeperTelemetry
  /** The keeper has stopped walking, on this tile. */
  onStopped: (tile: TileCoord) => void
}

/** Keys walk screen-relative to the game's one camera; following only slides it, never turns it. */
const FORWARD = cameraForward(HOME_VIEW)

function useCrossfade(object: Object3D, url: string) {
  const mixer = useMemo(() => new AnimationMixer(object), [object])
  const crossfade = useMemo(() => {
    const idle = findClipNamed(object.animations, 'idle')
    const walk = findClipNamed(object.animations, 'walk')
    if (!idle || !walk) throw new Error(`${url} needs both an idle and a walk clip`)
    return new ClipCrossfade({ idle: mixer.clipAction(idle), walk: mixer.clipAction(walk) })
  }, [mixer, object, url])
  useEffect(
    () => () => {
      crossfade.stop()
      mixer.uncacheRoot(object)
    },
    [crossfade, mixer, object],
  )
  return { mixer, crossfade }
}

/**
 * The keeper: walks where a tap or the arrow keys send it, along the route
 * `@sf/world` plans, crossfading idle ↔ walk on its own speed (ADR-0004).
 * Says where it stopped; what that means is for its owner to ask.
 */
export function Keeper({ world, model, scene, start, reducedMotion, telemetry, onStopped }: KeeperProps) {
  const object = useMemo(() => {
    const copy = clone(scene)
    copy.traverse((node) => {
      node.castShadow = true
    })
    return copy
  }, [scene])
  const { mixer, crossfade } = useCrossfade(object, model.url)
  const body = useRef<Group>(null)
  const walk = useRef(start)
  const steeredByKeys = useRef(false)
  const [destination, setDestination] = useState<TileCoord | null>(null)
  const invalidate = useThree((state) => state.invalidate)
  const held = useHeldKeys(invalidate)

  const onTap = useCallback(
    (tapped: TileCoord) => {
      const here = tileAt([walk.current.position.x, walk.current.position.z])
      const route = planWalk(world, here, tapped)
      if (!route) return
      walk.current = followRoute(walk.current, route)
      steeredByKeys.current = false
      const goal = route.at(-1) ?? null
      telemetry.headingFor(goal)
      setDestination(goal)
      invalidate()
    },
    [world, telemetry, invalidate],
  )
  useGroundTaps(onTap)

  function stepByKeys(): boolean {
    const screen = heldDirection(held.current)
    if (!screen) return false
    const from = tileAt([walk.current.position.x, walk.current.position.z])
    const route = routeForKeys({ world, from, screen, forward: FORWARD })
    if (!route) return false
    walk.current = followRoute(walk.current, route)
    steeredByKeys.current = true
    telemetry.headingFor(null)
    setDestination(null)
    return true
  }

  useFrame((_, delta) => {
    // Keys take over from a tap at once; their own steps run tile to tile.
    if (walk.current.waypoints.length === 0 || !steeredByKeys.current) stepByKeys()
    const step = stepWalk(walk.current, { delta, speed: KEEPER_SPEED })
    walk.current = step.walk
    if (step.arrived && !stepByKeys()) {
      telemetry.headingFor(null)
      setDestination(null)
      onStopped(tileAt([step.walk.position.x, step.walk.position.z]))
    }
    const clip = clipFor(step.speed, reducedMotion)
    crossfade.fadeTo(clip)
    // Reduced motion holds the pose instead of playing it (game rule 8).
    mixer.update(reducedMotion ? 0 : delta)
    body.current?.position.set(step.walk.position.x, 0, step.walk.position.z)
    body.current?.rotation.set(0, step.walk.yaw, 0)
    telemetry.movedTo(step.walk.position)
    telemetry.playing(clip)
    // One more frame after arriving, so everything that reads the keeper sees it stopped.
    if (walk.current.waypoints.length > 0 || step.arrived) invalidate()
  })

  return (
    <>
      <group ref={body} position={[start.position.x, 0, start.position.z]} rotation={[0, start.yaw, 0]}>
        <PlacedPiece model={model} object={object} position={[0, 0, 0]} />
      </group>
      {destination && <TargetMarker at={tileCentre(destination)} />}
    </>
  )
}
