import {
  type PlacedHotspot,
  type QuarterTurns,
  type Tile,
  type TileCoord,
  type TileWorld,
  type WorldOverrides,
  chunkOf,
  hotspotAt,
  isHotspotMoved,
  overriddenLayersAt,
  tileOf,
} from '@sf/world'

/** One line of the inspector: what it is, its value, and where the value came from. */
export type InspectorRow = {
  readonly label: string
  readonly value: string
  /** `null` for facts with no source, such as the coordinate. */
  readonly source: 'generated' | 'overridden' | 'layout' | 'moved' | null
}

function degrees(rotation: QuarterTurns): string {
  return `${rotation * 90}°`
}

function groundText(tile: Tile): string {
  return tile.ground.kind === 'path' ? `path (${tile.ground.role}, ${degrees(tile.ground.rotation)})` : tile.ground.kind
}

function structureText(tile: Tile): string {
  const { structure } = tile
  if (!structure) return 'none'
  const role = 'role' in structure ? `${structure.role}, ` : ''
  const pen = structure.enclosure ? ` — ${structure.enclosure}` : ''
  return `${structure.kind} (${role}${degrees(structure.rotation)})${pen}`
}

function hotspotRow(hotspot: PlacedHotspot | undefined, overrides: WorldOverrides): InspectorRow {
  if (!hotspot) return { label: 'Hotspot', value: 'none', source: null }
  return { label: 'Hotspot', value: hotspot.id, source: isHotspotMoved(overrides, hotspot.id) ? 'moved' : 'layout' }
}

/** Everything the inspector shows for a tile, or `null` off the land. Display only — every fact is `@sf/world`'s. */
export function inspectorRows(world: TileWorld, overrides: WorldOverrides, at: TileCoord): InspectorRow[] | null {
  const tile = tileOf(world, at)
  if (!tile) return null
  const layers = overriddenLayersAt(overrides, at)
  const source = (overridden: boolean): InspectorRow['source'] => (overridden ? 'overridden' : 'generated')
  const chunk = chunkOf(at)
  return [
    { label: 'Tile', value: `x ${at.x}, z ${at.z}`, source: null },
    { label: 'Chunk', value: `${chunk.cx}, ${chunk.cz}`, source: null },
    { label: 'Ground', value: groundText(tile), source: source(layers.ground) },
    { label: 'Structure', value: structureText(tile), source: source(layers.structure) },
    { label: 'Decor', value: tile.decor ? `${tile.decor.kind} (${degrees(tile.decor.rotation)})` : 'none', source: source(layers.decor) },
    hotspotRow(hotspotAt(world, at), overrides),
  ]
}
