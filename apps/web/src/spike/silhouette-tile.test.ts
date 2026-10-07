import { describe, expect, it } from 'vitest'
import {
  filledRatio,
  inkBounds,
  intersectionOverUnion,
  maskFromRgba,
  maskFromString,
  maskToString,
  squareAround,
  type Mask,
} from './silhouette-tile'

/** A `size`×`size` RGBA image, white except where `isInk(x, y)` paints a grey of `ink`. */
function image(size: number, isInk: (x: number, y: number) => boolean, ink = 0): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (isInk(x, y)) rgba.set([ink, ink, ink, 255], (y * size + x) * 4)
    }
  }
  return rgba
}

function mask(rows: string[]): Mask {
  return maskFromString(rows.join(''))
}

describe('inkBounds', () => {
  it('boxes the dark pixels tightly', () => {
    const rgba = image(8, (x, y) => x >= 2 && x <= 5 && y >= 3 && y <= 4)
    expect(inkBounds({ rgba, width: 8 })).toEqual({ left: 2, top: 3, width: 4, height: 2 })
  })

  it('returns null for a blank image', () => {
    expect(inkBounds({ rgba: image(4, () => false), width: 4 })).toBeNull()
  })

  it('treats a light-grey anti-aliased edge as background', () => {
    const rgba = image(4, (x) => x === 0, 200)
    expect(inkBounds({ rgba, width: 4 })).toBeNull()
  })
})

describe('squareAround', () => {
  it('grows the shorter side so the longer edge fills the tile, centred', () => {
    expect(squareAround({ left: 10, top: 20, width: 40, height: 20 })).toEqual({ left: 10, top: 10, width: 40, height: 40 })
  })
})

describe('maskFromRgba', () => {
  it('marks pixels darker than mid-grey as silhouette', () => {
    const tile = maskFromRgba(image(2, (x, y) => x === 1 && y === 0, 100))
    expect(maskToString(tile)).toBe('0100')
  })

  it('refuses a tile that is not square', () => {
    expect(() => maskFromRgba(new Uint8ClampedArray(3 * 4))).toThrow(RangeError)
  })
})

describe('filledRatio', () => {
  it('is the inked fraction of the tile', () => {
    expect(filledRatio(mask(['11', '10']))).toBe(0.75)
  })
})

describe('intersectionOverUnion', () => {
  it('is 1 for identical shapes and 0 for disjoint ones', () => {
    expect(intersectionOverUnion(mask(['10', '01']), mask(['10', '01']))).toBe(1)
    expect(intersectionOverUnion(mask(['10', '00']), mask(['01', '00']))).toBe(0)
  })

  it('is overlap divided by combined area', () => {
    // A covers 3 cells, B covers 2, they share 1: 1 / 4.
    expect(intersectionOverUnion(mask(['11', '10']), mask(['01', '01']))).toBe(0.25)
  })

  it('scores two empty masks as the same shape', () => {
    expect(intersectionOverUnion(mask(['00', '00']), mask(['00', '00']))).toBe(1)
  })

  it('refuses masks of different sizes', () => {
    expect(() => intersectionOverUnion(mask(['1']), mask(['10', '01']))).toThrow(RangeError)
  })
})

describe('mask encoding', () => {
  it('round-trips through a string', () => {
    const original = mask(['101', '010', '111'])
    expect(maskFromString(maskToString(original))).toEqual(original)
  })

  it('rejects a string that is not a square of 0s and 1s', () => {
    expect(() => maskFromString('101')).toThrow(RangeError)
    expect(() => maskFromString('1x01')).toThrow(RangeError)
  })
})
