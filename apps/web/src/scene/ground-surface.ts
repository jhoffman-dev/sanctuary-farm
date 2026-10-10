import { type Chunk, type GroundPiece, TILE_SIZE, tilesOfChunk } from '@sf/world'

/** Linear-space RGB, each channel 0–1, as a vertex colour attribute stores it. */
export type Rgb = readonly [number, number, number]

/** How one ground tile looks: its colour and the height of its top face. */
export type Surface = { readonly colour: Rgb; readonly height: number }

/** Flat arrays for one indexed, vertex-coloured mesh: three numbers per vertex, three indices per triangle. */
export type SurfaceArrays = {
  readonly positions: Float32Array
  readonly normals: Float32Array
  readonly colours: Float32Array
  readonly indices: Uint32Array
}

const VERTICES_PER_TILE = 4
/** Two triangles, wound counter-clockwise seen from above so the face points up (+Y). */
const QUAD_INDICES = [0, 2, 1, 1, 2, 3] as const

/**
 * One chunk's ground as a single mesh: a flat quad per tile, each tile its own
 * four vertices so colours do not bleed into neighbours. Seamless where the
 * Kenney ground patches are irregular blobs that leave gaps when tiled.
 */
export function buildGroundSurface(chunk: Chunk, surfaceOf: (ground: GroundPiece) => Surface): SurfaceArrays {
  const coords = tilesOfChunk(chunk.coord)
  const vertexCount = coords.length * VERTICES_PER_TILE
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const colours = new Float32Array(vertexCount * 3)
  const indices = new Uint32Array(coords.length * QUAD_INDICES.length)
  coords.forEach((coord, tileIndex) => {
    const tile = chunk.tiles[tileIndex]
    if (!tile) throw new Error(`Chunk ${chunk.coord.cx},${chunk.coord.cz} is missing tile ${tileIndex}`)
    const { colour, height } = surfaceOf(tile.ground)
    const first = tileIndex * VERTICES_PER_TILE
    // Corners in row order: north-west, north-east, south-west, south-east.
    for (let corner = 0; corner < VERTICES_PER_TILE; corner++) {
      const vertex = (first + corner) * 3
      positions.set([(coord.x + (corner % 2)) * TILE_SIZE, height, (coord.z + Math.floor(corner / 2)) * TILE_SIZE], vertex)
      normals.set([0, 1, 0], vertex)
      colours.set(colour, vertex)
    }
    indices.set(
      QUAD_INDICES.map((offset) => first + offset),
      tileIndex * QUAD_INDICES.length,
    )
  })
  return { positions, normals, colours, indices }
}
