import { describe, expect, it } from 'vitest'
import { estimateTextureBytes } from './texture-memory'

describe('estimateTextureBytes', () => {
  it('is zero with no textures', () => {
    expect(estimateTextureBytes([])).toBe(0)
  })

  it('counts RGBA8 bytes plus the mip chain', () => {
    expect(estimateTextureBytes([{ width: 1024, height: 1024 }])).toBe(Math.round(1024 * 1024 * 4 * (4 / 3)))
  })

  it('can leave the mip chain out', () => {
    expect(estimateTextureBytes([{ width: 256, height: 128 }], { mipmapped: false })).toBe(256 * 128 * 4)
  })

  it('sums several textures', () => {
    const sizes = [
      { width: 64, height: 64 },
      { width: 32, height: 32 },
    ]
    expect(estimateTextureBytes(sizes, { mipmapped: false })).toBe((64 * 64 + 32 * 32) * 4)
  })
})
