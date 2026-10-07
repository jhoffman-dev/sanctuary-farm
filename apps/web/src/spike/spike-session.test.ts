import { beforeEach, describe, expect, it } from 'vitest'
import { SpikeSession } from './spike-session'

const SAMPLE = {
  drawCalls: 7,
  triangles: 12_345,
  textureCount: 3,
  geometries: 9,
  programs: 4,
  textureBytes: 2048,
  silhouettePx: { Keeper: 165, Cow: 96 },
}

describe('SpikeSession', () => {
  let session: SpikeSession
  let readout: HTMLDivElement

  beforeEach(() => {
    session = new SpikeSession()
    readout = document.createElement('div')
    session.attachReadout(readout)
  })

  it('starts with nowhere to walk', () => {
    expect(session.target).toBeNull()
  })

  it('remembers the tapped point until the keeper arrives', () => {
    session.walkTo({ x: 2, z: -3 })
    expect(session.target).toEqual({ x: 2, z: -3 })
    session.arrived()
    expect(session.target).toBeNull()
  })

  it('publishes the scene sample and the keeper state as data attributes', () => {
    session.reportKeeper({ x: 1.2345, z: -0.5, clip: 'Walk' })
    session.recordFrame(1 / 60, 900)
    session.publish(SAMPLE)

    expect(readout.dataset.drawCalls).toBe('7')
    expect(readout.dataset.triangles).toBe('12345')
    expect(readout.dataset.textureBytes).toBe('2048')
    expect(readout.dataset.keeperX).toBe('1.234')
    expect(readout.dataset.keeperZ).toBe('-0.500')
    expect(readout.dataset.clip).toBe('Walk')
    expect(readout.dataset.frames).toBe('1')
    expect(readout.dataset.fps).toBe('60.0')
    expect(readout.dataset.silhouetteKeeper).toBe('165')
    expect(readout.dataset.silhouetteCow).toBe('96')
  })

  it('records the first frame time once and never moves it', () => {
    session.recordFrame(1 / 60, 812.4)
    session.recordFrame(1 / 60, 5000)
    session.publish(SAMPLE)
    expect(readout.dataset.firstFrameMs).toBe('812')
  })

  it('clears the frame counters on reset but keeps the keeper state', () => {
    session.reportKeeper({ x: 3, z: 4, clip: 'Walk' })
    session.recordFrame(1 / 30, 100)
    session.resetStats()
    session.publish(SAMPLE)
    expect(readout.dataset.frames).toBe('0')
    expect(readout.dataset.clip).toBe('Walk')
  })

  it('is harmless before the readout element exists', () => {
    const detached = new SpikeSession()
    expect(() => detached.publish(SAMPLE)).not.toThrow()
  })
})
