import { describe, expect, it } from 'vitest'
import { fitToHeight } from './model-fit'

describe('fitToHeight', () => {
  it('scales a model that already sits on the ground', () => {
    const { scale, offsetY } = fitToHeight({ bounds: { minY: 0, maxY: 1.856 }, targetHeight: 1.6 })
    expect(scale).toBeCloseTo(1.6 / 1.856, 12)
    expect(offsetY).toBeCloseTo(0, 12)
  })

  it('lifts a model whose origin is not at its feet', () => {
    const { scale, offsetY } = fitToHeight({ bounds: { minY: -2, maxY: 2 }, targetHeight: 1.6 })
    expect(scale).toBeCloseTo(0.4, 10)
    expect(offsetY).toBeCloseTo(0.8, 10)
  })

  it('rejects a model with no height rather than dividing by zero', () => {
    expect(() => fitToHeight({ bounds: { minY: 1, maxY: 1 }, targetHeight: 1.6 })).toThrow(RangeError)
  })
})
