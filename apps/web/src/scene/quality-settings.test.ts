import { describe, expect, it } from 'vitest'
import { MAX_DPR, qualitySettings, renderDpr } from './quality-settings'

describe('renderDpr', () => {
  it('caps a high-density screen at 1.5 on the high tier (a 2018 iPad draws at 1.5, not 2)', () => {
    expect(renderDpr({ deviceDpr: 2, maxDpr: MAX_DPR })).toBe(1.5)
    expect(renderDpr({ deviceDpr: 3, maxDpr: MAX_DPR })).toBe(1.5)
  })

  it('draws a screen under the cap at its own ratio', () => {
    expect(renderDpr({ deviceDpr: 1, maxDpr: MAX_DPR })).toBe(1)
    expect(renderDpr({ deviceDpr: 1.25, maxDpr: MAX_DPR })).toBe(1.25)
  })

  it('draws the low tier at 1 on any screen', () => {
    expect(renderDpr({ deviceDpr: 2, maxDpr: qualitySettings('low').maxDpr })).toBe(1)
  })

  it('never goes below 1, and survives a browser reporting nonsense', () => {
    expect(renderDpr({ deviceDpr: 0.5, maxDpr: MAX_DPR })).toBe(1)
    expect(renderDpr({ deviceDpr: Number.NaN, maxDpr: MAX_DPR })).toBe(1)
  })
})

describe('qualitySettings', () => {
  it('turns off shadows, idle loops and sway on the low tier, and keeps the full look on the high one', () => {
    expect(qualitySettings('low')).toEqual({ shadows: false, idleLoops: false, cameraSway: false, maxDpr: 1 })
    expect(qualitySettings('high')).toEqual({ shadows: true, idleLoops: true, cameraSway: true, maxDpr: MAX_DPR })
  })
})
