import { describe, expect, it } from 'vitest'
import { KeeperTelemetry } from './keeper-telemetry'

describe('KeeperTelemetry', () => {
  it('starts idle where the keeper stands, going nowhere', () => {
    const telemetry = new KeeperTelemetry({ x: 1, z: 2 })
    expect(telemetry.position).toEqual({ x: 1, z: 2 })
    expect(telemetry.clip).toBe('idle')
    expect(telemetry.destination).toBeNull()
    expect(telemetry.clipsSeen).toEqual(['idle'])
  })

  it('follows the keeper and where it is heading', () => {
    const telemetry = new KeeperTelemetry({ x: 0, z: 0 })
    telemetry.movedTo({ x: 3, z: 4 })
    telemetry.headingFor({ x: 5, z: 6 })
    expect(telemetry.position).toEqual({ x: 3, z: 4 })
    expect(telemetry.destination).toEqual({ x: 5, z: 6 })
  })

  it('records each change of clip once, in order', () => {
    const telemetry = new KeeperTelemetry({ x: 0, z: 0 })
    for (const clip of ['idle', 'walk', 'walk', 'idle', 'idle'] as const) telemetry.playing(clip)
    expect(telemetry.clipsSeen).toEqual(['idle', 'walk', 'idle'])
    expect(telemetry.clip).toBe('idle')
  })

  it('keeps only the most recent changes', () => {
    const telemetry = new KeeperTelemetry({ x: 0, z: 0 })
    for (let change = 0; change < 100; change++) telemetry.playing(change % 2 === 0 ? 'walk' : 'idle')
    expect(telemetry.clipsSeen).toHaveLength(32)
    expect(telemetry.clipsSeen.at(-1)).toBe('idle')
  })
})

describe('KeeperTelemetry, facing and cues', () => {
  it('follows which way the keeper faces', () => {
    const telemetry = new KeeperTelemetry({ x: 0, z: 0 })
    expect(telemetry.yaw).toBe(0)
    telemetry.turnedTo(1.25)
    expect(telemetry.yaw).toBe(1.25)
  })

  it('shows a cue while it lasts and counts every cue shown', () => {
    const telemetry = new KeeperTelemetry({ x: 0, z: 0 })
    expect(telemetry.cue).toBeNull()
    expect(telemetry.cuesShown).toBe(0)

    telemetry.cueing({ x: 30, z: 2 })
    expect(telemetry.cue).toEqual({ x: 30, z: 2 })
    telemetry.cueing(null)
    telemetry.cueing({ x: 31, z: 2 })

    expect(telemetry.cue).toEqual({ x: 31, z: 2 })
    expect(telemetry.cuesShown).toBe(2)
  })
})
