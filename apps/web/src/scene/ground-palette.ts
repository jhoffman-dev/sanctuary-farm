import type { GroundPiece } from '@sf/world'
import { Color } from 'three'
import type { Rgb, Surface } from './ground-surface'

/**
 * Ground colours, sampled from the Kenney atlases under each kit's own ground
 * piece so the surface matches the models standing on it: Mini Forest's
 * `patch-grass` and `patch-dirt`, Fantasy Town's `road`. Paths are coloured
 * into the surface rather than drawn as `road` models: the road tiles showed a
 * seam at every tile edge and cost a draw (and a shadow draw) per chunk. Water
 * has no atlas piece in these kits (ADR-0003 gap), so it is a calm blue-green.
 */
const GROUND_HEX = {
  grass: '#76bc88',
  dirt: '#ea9168',
  path: '#a0a8c9',
  water: '#5fb7b0',
} as const satisfies Record<GroundPiece['kind'], string>

/** Water sits a little below the land so a pond reads as a hollow, not paint. */
const WATER_HEIGHT = -0.06

/** sRGB hex to the linear values a vertex colour attribute holds. */
function linear(hex: string): Rgb {
  const { r, g, b } = new Color(hex)
  return [r, g, b]
}

const SURFACES: Record<GroundPiece['kind'], Surface> = {
  grass: { colour: linear(GROUND_HEX.grass), height: 0 },
  dirt: { colour: linear(GROUND_HEX.dirt), height: 0 },
  path: { colour: linear(GROUND_HEX.path), height: 0 },
  water: { colour: linear(GROUND_HEX.water), height: WATER_HEIGHT },
}

export function surfaceOf(ground: GroundPiece): Surface {
  return SURFACES[ground.kind]
}

/** The grass beyond the farm's chunks, under the fog: one colour with the land so the edge never shows. */
export const HORIZON_GRASS = GROUND_HEX.grass
