// Farmyard world contract. Implementation owned by Track C.
// Phase 0 ships STUBs for tilemap, pathfind, Farmyard, Character, camera.

export type TileType = 'grass' | 'path' | 'fence' | 'water' | 'building'

export type Vec2 = { x: number; y: number }

export type HotspotId = 'barn' | 'paddock' | 'nest' | 'feedshed' | 'farmhouse'

export type Hotspot = {
  id: HotspotId
  tile: Vec2 // the tile the player must reach to trigger
  label: string
}

/** The static map. Owned by Track C (src/world/tilemap.ts). */
export type Tilemap = {
  width: number
  height: number
  /** row-major, length width*height */
  tiles: TileType[]
  hotspots: Hotspot[]
  /** Where the character spawns / resets to (the farmhouse door). */
  playerStart: Vec2
  at(x: number, y: number): TileType
  isWalkable(x: number, y: number): boolean
}

/** A* over the walkability grid. Returns tile-centre waypoints incl. neither
 *  endpoint tile duplicated, or null when unreachable. Owned by src/world/pathfind.ts. */
export type FindPath = (map: Tilemap, from: Vec2, to: Vec2) => Vec2[] | null

export type FarmyardProps = {
  map?: Tilemap // defaults to the real map; tests may inject
  /** Fired when the character finishes walking onto a hotspot tile. */
  onHotspot: (id: HotspotId) => void
  /** Optional: indicators to float over hotspots (e.g. chores pending on the barn). */
  badges?: Partial<Record<HotspotId, boolean>>
}
