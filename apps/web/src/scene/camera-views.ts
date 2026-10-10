import { type ChunkCoord, type TileWorld, chunkOrigin, CHUNK_SIZE, tileCentre, tilesOfChunk } from '@sf/world'
import { footprintCentre } from './piece-placement'

export type Vec3 = readonly [number, number, number]
export type CameraView = { readonly position: Vec3; readonly lookAt: Vec3 }

/**
 * Art-direction §2: the three-quarter "storybook" angle the child plays at,
 * far enough out that all seven hotspots are in frame at 1280 × 800. The same
 * numbers as `farm.json`'s `camera.home`; a test holds the two together.
 */
export const HOME_VIEW: CameraView = { position: [13, 12.5, 18.5], lookAt: [0, 0.6, 1] }

/** Dev views for checking the world by eye; the game itself only ever uses `HOME_VIEW`. */
export const DEV_VIEW_NAMES = ['overview', 'paddock-corner'] as const
export type DevViewName = (typeof DEV_VIEW_NAMES)[number]

/** Height above the land's centre that fits every chunk in a 35° frame, looking almost straight down. */
const OVERVIEW_HEIGHT_PER_TILE = 1.75

/**
 * High above the middle of the chunks, tipped just off vertical so `lookAt`
 * keeps north at the top; `margin` tiles of the land around them stay in frame too.
 */
export function overviewOf(chunks: readonly ChunkCoord[], margin = 0): CameraView {
  const origins = chunks.map(chunkOrigin)
  const minX = Math.min(...origins.map((origin) => origin.x)) - margin
  const minZ = Math.min(...origins.map((origin) => origin.z)) - margin
  const maxX = Math.max(...origins.map((origin) => origin.x)) + CHUNK_SIZE + margin
  const maxZ = Math.max(...origins.map((origin) => origin.z)) + CHUNK_SIZE + margin
  const centre: Vec3 = [(minX + maxX) / 2, 0, (minZ + maxZ) / 2]
  const height = Math.max(maxX - minX, maxZ - minZ) * OVERVIEW_HEIGHT_PER_TILE
  return { position: [centre[0], height, centre[2] + 0.01], lookAt: centre }
}

/** How far into the pen, and how high, the close-up camera stands from the corner it looks at. */
const CORNER_CAMERA_INSET = 2.6
const CORNER_CAMERA_HEIGHT = 1.8

/**
 * Close on a paddock fence corner, from inside the pen looking out at it —
 * the pen's floor is clear, so nothing outside the fence stands in the way.
 */
function paddockCorner(world: TileWorld): CameraView {
  const paddock = world.hotspots.find((hotspot) => hotspot.id === 'paddock')
  const corner = world.chunks
    .flatMap((chunk) =>
      tilesOfChunk(chunk.coord).filter((_, index) => {
        const structure = chunk.tiles[index]?.structure
        return structure?.kind === 'fence' && structure.role === 'corner' && structure.enclosure === 'paddock'
      }),
    )
    .at(0)
  if (!paddock || !corner) throw new Error('The world has no paddock fence corner to look at')
  const [x, z] = tileCentre(corner)
  const centre = footprintCentre(paddock.footprint)
  const inward = Math.hypot(centre.x - x, centre.z - z)
  const step = CORNER_CAMERA_INSET / inward
  return {
    position: [x + (centre.x - x) * step, CORNER_CAMERA_HEIGHT, z + (centre.z - z) * step],
    lookAt: [x, 0.2, z],
  }
}

export function devView(world: TileWorld, name: DevViewName): CameraView {
  return name === 'overview' ? overviewOf(world.chunks.map((chunk) => chunk.coord)) : paddockCorner(world)
}
