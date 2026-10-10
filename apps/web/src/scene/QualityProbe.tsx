import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { readDeviceSignals } from './device-signals'
import { classifyDevice, type DeviceSignals, FrameSampler, lowTierFromSignals, type TierVerdict } from './quality-tier'

type QualityProbeProps = {
  /** Time frames as well as reading the device. Off under reduced motion, where the loop draws on demand. */
  sampleFrames: boolean
  onDecided: (verdict: TierVerdict) => void
}

/**
 * First visit only: reads the device and times about a second of frames on the
 * high tier, then reports a tier once. Mounted with the world's models, so the
 * frames it times are frames of the real farm. The rules are `quality-tier`'s.
 */
export function QualityProbe({ sampleFrames, onDecided }: QualityProbeProps) {
  const signals = useRef<DeviceSignals | null>(null)
  const sampler = useRef(new FrameSampler())
  const decided = useRef(false)

  useFrame(({ gl }, delta) => {
    if (decided.current) return
    signals.current ??= readDeviceSignals(gl.getContext(), navigator)
    const decide = (verdict: TierVerdict) => {
      decided.current = true
      onDecided(verdict)
    }
    if (!sampleFrames || lowTierFromSignals(signals.current)) {
      decide(classifyDevice(signals.current, []))
      return
    }
    const sample = sampler.current.add(delta * 1000)
    if (sample) decide(classifyDevice(signals.current, sample))
  })
  return null
}
