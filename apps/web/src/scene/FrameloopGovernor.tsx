import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { isSettled, STILL_METRES } from './frameloop'
import type { KeeperTelemetry } from './keeper-telemetry'

type FrameloopGovernorProps = {
  telemetry: KeeperTelemetry
  /** Called only when the farm settles or stirs, never per frame: each call is a React commit. */
  onSettledChange: (settled: boolean) => void
}

type Spot = { x: number; y: number; z: number }

function movedApart(one: Spot, other: Spot): boolean {
  return Math.hypot(one.x - other.x, one.y - other.y, one.z - other.z) > STILL_METRES
}

/**
 * Watches the keeper and the camera for movement and says when the farm has
 * been still long enough to stop drawing (`frameloop` rules: `frameloop.ts`).
 * On demand it only runs on frames something asked for — a tap or a key
 * wakes the keeper, whose next step is the movement seen here.
 */
export function FrameloopGovernor({ telemetry, onSettledChange }: FrameloopGovernorProps) {
  const last = useRef<{ keeper: Spot; camera: Spot } | null>(null)
  const secondsStill = useRef(0)
  const reported = useRef(false)

  useFrame(({ camera }, delta) => {
    const keeper = { x: telemetry.position.x, y: 0, z: telemetry.position.z }
    const eye = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
    const previous = last.current
    const moved = !previous || movedApart(keeper, previous.keeper) || movedApart(eye, previous.camera)
    last.current = { keeper, camera: eye }
    secondsStill.current = moved ? 0 : secondsStill.current + delta
    const settled = isSettled(secondsStill.current)
    if (settled === reported.current) return
    reported.current = settled
    onSettledChange(settled)
  })
  return null
}
