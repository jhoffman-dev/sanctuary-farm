/**
 * Turns a model's measured bounds into the numbers that place it on the tile
 * grid (1 tile = 1 world unit). Kept apart from the catalogue so the arithmetic
 * is tested once and every entry derives its numbers the same way.
 */

import type { QuarterTurns } from '@sf/world'

export type Vec3 = readonly [number, number, number]

/** Axis-aligned bounds of the whole GLB scene in its own units, read from its accessors. */
export type NativeBounds = { readonly min: Vec3; readonly max: Vec3 }


/**
 * three.js turns counter-clockwise about +Y, so a clockwise quarter turn is a
 * negative angle; normalised into [0, 2π) so equal turns compare equal.
 */
export function quarterTurnsToRadians(turns: QuarterTurns): number {
  return (((4 - turns) % 4) * Math.PI) / 2
}

/** `base` sets the model's lowest point on y = 0; `top` sinks a ground tile so its top surface is y = 0. */
export type Rest = 'base' | 'top'

/** `origin` keeps the author's pivot; `centre` moves the bounds' XZ centre onto the tile centre. */
export type Anchor = 'origin' | 'centre'

export type Footprint = { readonly x: number; readonly z: number }

/** A horizontal move in world units, as seen at a world rotation of 0 (+X east, +Z south). */
export type Shift = { readonly x: number; readonly z: number }

export type FitSpec = {
  readonly bounds: NativeBounds
  readonly scale: number
  readonly quarterTurns: QuarterTurns
  readonly rest: Rest
  readonly anchor: Anchor
  /** Applied after anchoring, for a model whose pivot is in the wrong place on the tile. */
  readonly shift?: Shift
}

export type PieceFit = {
  /** Radians about +Y in three.js's counter-clockwise sense, applied inside the world's own rotation. */
  readonly rotationOffset: number
  readonly scale: number
  readonly yOffset: number
  /** World units, applied to the scaled model before `rotationOffset`. */
  readonly modelOffset: { readonly x: number; readonly z: number }
  /** Whole tiles covered along world X and Z at a world rotation of 0. */
  readonly footprint: Footprint
}

/**
 * A model may overhang its tile by this much and still count as one tile:
 * Kenney's trees and roofs overhang by a few centimetres so neighbours meet.
 */
const OVERHANG_TOLERANCE = 0.15

function tilesCovering(extent: number): number {
  return Math.max(1, Math.ceil(extent - OVERHANG_TOLERANCE))
}

/** The uniform scale that makes a model `targetHeight` world units tall. */
export function scaleToHeight(bounds: NativeBounds, targetHeight: number): number {
  return targetHeight / (bounds.max[1] - bounds.min[1])
}

/**
 * `modelOffset` is applied before `rotationOffset`, so a shift wanted in world
 * terms is turned back through the inverse of that rotation first.
 */
function shiftInModelFrame(shift: Shift, rotationOffset: number): Shift {
  const cos = Math.cos(rotationOffset)
  const sin = Math.sin(rotationOffset)
  return { x: shift.x * cos - shift.z * sin, z: shift.x * sin + shift.z * cos }
}

export function fitPiece({ bounds, scale, quarterTurns, rest, anchor, shift = { x: 0, z: 0 } }: FitSpec): PieceFit {
  const [minX, minY, minZ] = bounds.min
  const [maxX, maxY, maxZ] = bounds.max
  const nativeX = (maxX - minX) * scale
  const nativeZ = (maxZ - minZ) * scale
  const swapsAxes = quarterTurns % 2 === 1
  const centred = anchor === 'centre'
  const rotationOffset = quarterTurnsToRadians(quarterTurns)
  const shifted = shiftInModelFrame(shift, rotationOffset)
  return {
    rotationOffset,
    scale,
    yOffset: -(rest === 'base' ? minY : maxY) * scale,
    modelOffset: {
      x: (centred ? (-(minX + maxX) / 2) * scale : 0) + shifted.x,
      z: (centred ? (-(minZ + maxZ) / 2) * scale : 0) + shifted.z,
    },
    footprint: {
      x: tilesCovering(swapsAxes ? nativeZ : nativeX),
      z: tilesCovering(swapsAxes ? nativeX : nativeZ),
    },
  }
}
