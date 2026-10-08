import {
  type Chunk,
  type PieceId,
  type PlacedHotspot,
  type QuarterTurns,
  type TileRect,
  pieceIdOf,
  tileCentre,
  tilesOfChunk,
} from '@sf/world'
import { type PieceFit, quarterTurnsToRadians } from '../world-assets'

/** Where a piece stands: a point on the ground (world units) and the world's quarter turns. */
export type Placement = { readonly x: number; readonly z: number; readonly rotation: QuarterTurns }

/** A placed model's own transform, ready for a matrix: translate, then turn about +Y, then scale. */
export type PieceTransform = {
  readonly position: readonly [number, number, number]
  /** Radians about +Y, three.js's counter-clockwise sense. */
  readonly yaw: number
  readonly scale: number
}

/** Everything one instanced draw needs: which piece, and every place it stands. */
export type PieceGroup = { readonly pieceId: PieceId; readonly placements: readonly Placement[] }

/**
 * The world's turn, then the catalogue's turn, then the model's offset and
 * scale — the same order `PlacedPiece` nests its groups in, flattened so it
 * can feed an instance matrix. The offset is in the turned frame, so it is
 * rotated with the model.
 */
export function pieceTransform(model: PieceFit, at: Placement): PieceTransform {
  const yaw = quarterTurnsToRadians(at.rotation) + model.rotationOffset
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const { x: offsetX, z: offsetZ } = model.modelOffset
  return {
    position: [at.x + offsetX * cos + offsetZ * sin, model.yOffset, at.z - offsetX * sin + offsetZ * cos],
    yaw,
    scale: model.scale,
  }
}

function addTo(groups: Map<PieceId, Placement[]>, pieceId: PieceId, placement: Placement): void {
  const placements = groups.get(pieceId) ?? []
  placements.push(placement)
  groups.set(pieceId, placements)
}

/**
 * Every model the chunks ask for, grouped by `PieceId` across all of them so
 * each piece type is one instanced draw for the whole world: structures and
 * decor. Ground is not a model — it is one surface per chunk
 * (`ground-surface.ts`). Grouped per world, not per chunk, because draw calls
 * are the budget line the farm hits first (ADR-0004); a chunk added later
 * rebuilds a few instance buffers, which costs microseconds.
 */
export function groupPieces(chunks: readonly Chunk[]): PieceGroup[] {
  const groups = new Map<PieceId, Placement[]>()
  for (const chunk of chunks) {
    tilesOfChunk(chunk.coord).forEach((coord, index) => {
      const tile = chunk.tiles[index]
      if (!tile) return
      const [x, z] = tileCentre(coord)
      if (tile.structure) addTo(groups, pieceIdOf(tile.structure), { x, z, rotation: tile.structure.rotation })
      if (tile.decor) addTo(groups, pieceIdOf(tile.decor), { x, z, rotation: tile.decor.rotation })
    })
  }
  return [...groups].map(([pieceId, placements]) => ({ pieceId, placements }))
}

/** The middle of a footprint, in world units: a 4-wide pen's centre falls on a tile edge, not a tile. */
export function footprintCentre(rect: TileRect): { readonly x: number; readonly z: number } {
  return { x: rect.x + rect.width / 2, z: rect.z + rect.depth / 2 }
}

/**
 * Each open hotspot's marker model, in the middle of its footprint, facing out
 * through its entrance. Fenced and building footprints are already marked by
 * what the world builds on them — a gate or a door at the entrance — so a
 * marker there would duplicate it (the paddock's marker is the gate model) or
 * stand unseen inside the walls.
 */
export function hotspotMarkers(hotspots: readonly PlacedHotspot[]): PieceGroup[] {
  return hotspots.filter((hotspot) => hotspot.style === 'open').map((hotspot) => ({
    pieceId: `hotspot:${hotspot.id}`,
    placements: [{ ...footprintCentre(hotspot.footprint), rotation: hotspot.rotation }],
  }))
}
