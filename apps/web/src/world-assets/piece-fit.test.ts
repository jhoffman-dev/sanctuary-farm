import { describe, expect, it } from 'vitest'
import { fitPiece, type NativeBounds, quarterTurnsToRadians, scaleToHeight } from './piece-fit'

/** Fantasy Town's fence: 7.5 cm thick on the tile's +X edge, one tile long along Z. */
const EDGE_FENCE: NativeBounds = { min: [0.425, 0, -0.5], max: [0.5, 0.38, 0.5] }
const COW: NativeBounds = { min: [-0.77, 0, -0.625], max: [0.77, 1.612, 0.835] }

describe('fitPiece', () => {
  it('turns a clockwise quarter turn into three.js radians and swaps the footprint axes', () => {
    const fit = fitPiece({ bounds: { min: [-1, 0, -0.5], max: [1, 1, 0.5] }, scale: 1, quarterTurns: 1, rest: 'base', anchor: 'origin' })
    expect(fit.rotationOffset).toBeCloseTo((3 * Math.PI) / 2, 12)
    expect(fit.footprint).toEqual({ x: 1, z: 2 })
  })

  it('moves an edge piece onto the tile centre when anchored at its centre', () => {
    const fit = fitPiece({ bounds: EDGE_FENCE, scale: 1, quarterTurns: 1, rest: 'base', anchor: 'centre' })
    expect(fit.modelOffset.x).toBeCloseTo(-0.4625, 12)
    expect(fit.modelOffset.z).toBeCloseTo(0, 12)
    expect(fit.footprint).toEqual({ x: 1, z: 1 })
  })

  it('keeps the author pivot when anchored at the origin', () => {
    expect(fitPiece({ bounds: EDGE_FENCE, scale: 1, quarterTurns: 0, rest: 'base', anchor: 'origin' }).modelOffset).toEqual({ x: 0, z: 0 })
  })

  it('rests a model on its base, or sinks a ground tile so its top is y = 0', () => {
    const bounds: NativeBounds = { min: [-0.5, -0.1, -0.5], max: [0.5, 0.2, 0.5] }
    expect(fitPiece({ bounds, scale: 2, quarterTurns: 0, rest: 'base', anchor: 'origin' }).yOffset).toBeCloseTo(0.2, 12)
    expect(fitPiece({ bounds, scale: 2, quarterTurns: 0, rest: 'top', anchor: 'origin' }).yOffset).toBeCloseTo(-0.4, 12)
  })

  it('counts whole tiles after scaling, forgiving a small overhang but not a real one', () => {
    const tree = fitPiece({ bounds: { min: [-0.512, 0, -0.512], max: [0.512, 2.4, 0.512] }, scale: 1, quarterTurns: 0, rest: 'base', anchor: 'origin' })
    expect(tree.footprint).toEqual({ x: 1, z: 1 })
    const cow = fitPiece({ bounds: COW, scale: scaleToHeight(COW, 1.3), quarterTurns: 2, rest: 'base', anchor: 'origin' })
    expect(cow.footprint).toEqual({ x: 2, z: 2 })
  })

  it('never reports a footprint under one tile', () => {
    const crumb = fitPiece({ bounds: { min: [0, 0, 0], max: [0.01, 0.01, 0.01] }, scale: 1, quarterTurns: 0, rest: 'base', anchor: 'origin' })
    expect(crumb.footprint).toEqual({ x: 1, z: 1 })
  })
})

describe('fitPiece shift', () => {
  it('moves the placed model by the shift in world terms, whatever the catalogue turn', () => {
    for (const quarterTurns of [0, 1, 2, 3] as const) {
      const fit = fitPiece({ bounds: { min: [0, 0, 0], max: [1, 1, 1] }, scale: 1, quarterTurns, rest: 'base', anchor: 'origin', shift: { x: 0.3, z: -0.2 } })
      // Where the model's origin lands: its offset turned through rotationOffset, as PlacedPiece does.
      const cos = Math.cos(fit.rotationOffset)
      const sin = Math.sin(fit.rotationOffset)
      const { x, z } = fit.modelOffset
      expect(x * cos + z * sin).toBeCloseTo(0.3, 12)
      expect(-x * sin + z * cos).toBeCloseTo(-0.2, 12)
    }
  })
})

describe('scaleToHeight', () => {
  it('scales a model to the target height whatever its base', () => {
    expect(scaleToHeight({ min: [0, -2, 0], max: [1, 2, 1] }, 1.6)).toBeCloseTo(0.4, 12)
  })
})

describe('quarterTurnsToRadians', () => {
  it('turns clockwise seen from above: one turn carries north (−Z) to east (+X)', () => {
    const angle = quarterTurnsToRadians(1)
    // three.js rotation about +Y applied to the north vector (0, 0, −1).
    expect(-Math.sin(angle)).toBeCloseTo(1, 12)
    expect(-Math.cos(angle)).toBeCloseTo(0, 12)
  })

  it('maps every turn into [0, 2π)', () => {
    expect([0, 1, 2, 3].map((turns) => quarterTurnsToRadians(turns as 0 | 1 | 2 | 3))).toEqual([0, 1.5 * Math.PI, Math.PI, 0.5 * Math.PI])
  })
})
