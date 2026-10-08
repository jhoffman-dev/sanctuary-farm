export type {
  Area,
  CameraAnchor,
  Degrees,
  FarmPath,
  Ground,
  GroundMaterial,
  Hotspot,
  HotspotId,
  Point2,
  Point3,
  PropGroup,
  PropInstance,
  WorldCamera,
  WorldLayout,
} from './world-layout'
export { GROUND_MATERIALS, HOTSPOT_IDS, LAYOUT_SCHEMA_VERSION } from './world-layout'

export type { ParsedFarmLayout } from './parse-farm-layout'
export { parseFarmLayout } from './parse-farm-layout'

export { loadFarmLayout } from './farm-layout'

export { hotspotContaining } from './hotspot-containing'

export { areaContains, areasOverlap, areaWithinGround, distance2, pointWithinGround } from './geometry'

export {
  KEEPER_SPEED,
  MAX_CAMERA_ELEVATION_DEGREES,
  MAX_CAMERA_FOV_DEGREES,
  MAX_CROSSING_SECONDS,
  MAX_GROUND_SIZE,
  MIN_CAMERA_ELEVATION_DEGREES,
  MIN_CAMERA_FOV_DEGREES,
  cameraElevationDegrees,
  crossingSeconds,
  layoutRuleViolations,
  slowestCrossingSeconds,
} from './layout-rules'

// The tile world (SF-87): chunks, a seeded generator, autotiling and authored overrides.
export type {
  AutotileKind,
  AutotileRole,
  BuildingPartKind,
  DecorKind,
  DecorPiece,
  GroundKind,
  GroundPiece,
  PieceId,
  QuarterTurns,
  StructureKind,
  StructurePiece,
} from './tile-kinds'
export {
  AUTOTILE_KINDS,
  AUTOTILE_ROLES,
  BUILDING_PART_KINDS,
  DECOR_KINDS,
  GROUND_KINDS,
  PIECE_IDS,
  STRUCTURE_KINDS,
  pieceIdOf,
} from './tile-kinds'

export type { ChunkCoord, Direction, TileCoord, TileRect } from './tile-grid'
export {
  CHUNK_SIZE,
  DIRECTIONS,
  TILE_SIZE,
  chunkOf,
  chunkOrigin,
  chunksCoveringGround,
  indexInChunk,
  neighbour,
  tileAt,
  tileCentre,
  tilesOfChunk,
} from './tile-grid'

export type { AutotileChoice, NeighbourMask } from './autotile'
export { autotile, maskOf } from './autotile'

export type { Rng, RngFactory } from './seeds'

export type { FootprintStyle, HotspotAnchor } from './hotspot-anchors'
export { HOTSPOT_STYLES, anchorsFromLayout } from './hotspot-anchors'

export type { HotspotMove, TileEdit, WorldEdit, WorldOverrides } from './world-overrides'
export { NO_OVERRIDES, OVERRIDES_SCHEMA_VERSION, WORLD_EDIT_OPS } from './world-overrides'

export type { ParsedWorldOverrides } from './parse-world-overrides'
export { parseWorldOverrides } from './parse-world-overrides'

export type { Chunk, PlacedHotspot, Tile, TileWorld } from './tile-world-types'
export type { WorldSpec } from './tile-world'
export { addChunk, buildTileWorld, tileOf } from './tile-world'

export { FARM_WORLD_SEED, farmStartingChunks, farmWorldSpec, loadWorldOverrides } from './farm-tile-world'
