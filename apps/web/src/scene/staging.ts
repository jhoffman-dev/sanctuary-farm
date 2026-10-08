import { type HotspotId, type PlacedHotspot, type QuarterTurns, tileCentre } from '@sf/world'
import type { AnimalSpecies } from '../world-assets'
import { footprintCentre, type Placement } from './piece-placement'

/**
 * Where the animals and the keeper stand while the world has nothing for them
 * to do. Set dressing only: it reads the hotspots and decides nothing about
 * the game — movement and behaviour arrive with their own tickets.
 */

export type StagedAnimal = Placement & { readonly species: AnimalSpecies }
export type Staging = { readonly animals: readonly StagedAnimal[]; readonly keeper: Placement }

/** Two turns from north: animals and keeper face +Z, towards the §2 camera, so their faces read. */
const TOWARDS_CAMERA: QuarterTurns = 2

/**
 * Each animal's home, and how far from the footprint's centre it stands
 * (world units, east / south) — off the middle, where an open hotspot's
 * marker stands.
 */
const HOMES: readonly { species: AnimalSpecies; hotspot: HotspotId; dx: number; dz: number }[] = [
  { species: 'cow', hotspot: 'paddock', dx: -1, dz: 0 },
  { species: 'hog', hotspot: 'paddock', dx: 1.2, dz: 0.4 },
  { species: 'pig', hotspot: 'petting-zoo', dx: -1, dz: 0.5 },
  { species: 'chick', hotspot: 'nest', dx: 0.7, dz: 0.4 },
]

function hotspotNamed(hotspots: readonly PlacedHotspot[], id: HotspotId): PlacedHotspot {
  const hotspot = hotspots.find((candidate) => candidate.id === id)
  if (!hotspot) throw new Error(`The world has no ${id} hotspot to stage`)
  return hotspot
}

export function stageWorld(hotspots: readonly PlacedHotspot[]): Staging {
  const animals = HOMES.map(({ species, hotspot, dx, dz }) => {
    const centre = footprintCentre(hotspotNamed(hotspots, hotspot).footprint)
    return { species, x: centre.x + dx, z: centre.z + dz, rotation: TOWARDS_CAMERA }
  })
  // The keeper waits where the path meets the farmhouse door.
  const [x, z] = tileCentre(hotspotNamed(hotspots, 'farmhouse').arrival)
  return { animals, keeper: { x, z, rotation: TOWARDS_CAMERA } }
}
