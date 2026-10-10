import { type Anchor, fitPiece, type NativeBounds, type PieceFit, type QuarterTurns, type Rest, scaleToHeight } from './piece-fit'
import type { AnimalSpecies, KeeperVariant, PieceId } from './piece-kinds'

/**
 * Which Kenney GLB draws each piece kind, and how to sit it on the tile grid.
 *
 * The GLBs under `public/models/kenney/<kit>/` are Kenney's files, unmodified
 * (ADR-0003 addendum: GLB-native, no conversion). Each one references its kit's
 * `Textures/colormap.png` by relative URI, so a kit's atlas is one file the
 * browser fetches once, whatever the number of models.
 *
 * `bounds` are measured from each GLB's accessors (min/max through the node
 * transforms) and checked against the files by a test, so they cannot drift.
 */

export const KENNEY_KITS = [
  'cube-pets',
  'mini-characters',
  'fantasy-town-kit',
  'survival-kit',
  'mini-forest',
  'food-kit',
] as const
export type KenneyKit = (typeof KENNEY_KITS)[number]

export type PieceModel = PieceFit & {
  readonly kit: KenneyKit
  readonly url: string
  readonly atlasUrl: string
  readonly nativeBounds: NativeBounds
  /** True where Kenney has no real piece for the kind and a stand-in fills the slot. */
  readonly placeholder: boolean
  readonly note?: string
}

const MODELS_ROOT = '/models/kenney'

export function kitDirectory(kit: KenneyKit): string {
  return `${MODELS_ROOT}/${kit}`
}

type PieceSpec = {
  readonly kit: KenneyKit
  readonly file: string
  readonly bounds: NativeBounds
  /** Uniform scale, or a target height in world units (art-direction §2) to derive it from. */
  readonly size: { readonly scale: number } | { readonly height: number }
  readonly quarterTurns?: QuarterTurns
  readonly rest?: Rest
  readonly anchor?: Anchor
  readonly placeholder?: string
}

function piece(spec: PieceSpec): PieceModel {
  const scale = 'scale' in spec.size ? spec.size.scale : scaleToHeight(spec.bounds, spec.size.height)
  const fit = fitPiece({
    bounds: spec.bounds,
    scale,
    quarterTurns: spec.quarterTurns ?? 0,
    rest: spec.rest ?? 'base',
    anchor: spec.anchor ?? 'origin',
  })
  return {
    ...fit,
    kit: spec.kit,
    url: `${kitDirectory(spec.kit)}/${spec.file}.glb`,
    atlasUrl: `${kitDirectory(spec.kit)}/Textures/colormap.png`,
    nativeBounds: spec.bounds,
    placeholder: spec.placeholder !== undefined,
    ...(spec.placeholder === undefined ? {} : { note: spec.placeholder }),
  }
}

/** Fantasy Town and Mini Forest are authored on a 1-unit grid; Survival Kit on a 0.5-unit one. */
const TOWN_SCALE = { scale: 1 }
const SURVIVAL_SCALE = { scale: 2 }

/*
 * Native facings below were measured from each GLB's vertices, not assumed:
 * Fantasy Town's fence, gate and walls touch only the tile's north and south
 * edges, on its east side; the curved fence touches the NW and SE corners
 * (an edge-fence arc joining the west and south neighbours); Cube Pets' heads
 * (their top quarter) sit towards +Z.
 */

/** Fantasy Town's fence runs north–south on the tile's east edge: centring it is all it needs. */
const FENCE_BOUNDS: NativeBounds = { min: [0.425, 0, -0.5], max: [0.5, 0.38, 0.5] }
const fenceRun = (placeholder?: string): PieceModel =>
  piece({
    kit: 'fantasy-town-kit',
    file: 'fence',
    bounds: FENCE_BOUNDS,
    size: TOWN_SCALE,
    anchor: 'centre',
    ...(placeholder === undefined ? {} : { placeholder }),
  })

/** A full road tile joins seamlessly on all four sides, so every path role is the same tile. */
const ROAD_BOUNDS: NativeBounds = { min: [-0.5, 0, -0.5], max: [0.5, 0.025, 0.5] }
const roadTile = (): PieceModel =>
  piece({ kit: 'fantasy-town-kit', file: 'road', bounds: ROAD_BOUNDS, size: TOWN_SCALE, rest: 'top' })

/** Fantasy Town's walls stand on the tile's east edge: three clockwise turns carry east to north. */
const WALL_BOUNDS: NativeBounds = { min: [0.4, 0, -0.5], max: [0.5, 1, 0.5] }
const wall = (file: string, placeholder: string): PieceModel =>
  piece({ kit: 'fantasy-town-kit', file, bounds: WALL_BOUNDS, size: TOWN_SCALE, quarterTurns: 3, placeholder })

/** Mini Forest's patches are irregular blobs, not tiles: they do not join edge to edge. */
const GROUND_PATCH = 'An irregular patch, not a seamless tile; ADR-0003 has the ground as a flat plane with patches on top.'
const BUILDING_GAP = 'Fantasy Town wall/roof pieces stand in until GLB farm structures are sourced (#115 on hold).'
const HOTSPOT_GAP = 'A marker for the hotspot, not its structure; the structure waits for a GLB source (#115/#116 on hold).'

/** Cube Pets face +Z (south); two turns make them face north like everything else (§8). */
const animal = (file: string, bounds: NativeBounds, height: number): PieceModel =>
  piece({ kit: 'cube-pets', file, bounds, size: { height }, quarterTurns: 2 })

/** Art-direction §2: keeper 1.6 units tall. Mini Characters face +Z, like Cube Pets. */
const KEEPER_HEIGHT = 1.6
const keeper = (file: string, bounds: NativeBounds): PieceModel =>
  piece({ kit: 'mini-characters', file, bounds, size: { height: KEEPER_HEIGHT }, quarterTurns: 2 })

const GROUND: Readonly<Record<'grass' | 'dirt' | 'water', PieceModel>> = {
  grass: piece({
    kit: 'mini-forest',
    file: 'patch-grass',
    bounds: { min: [-0.5, 0, -0.5], max: [0.5, 0.171, 0.5] },
    size: TOWN_SCALE,
    rest: 'top',
    placeholder: GROUND_PATCH,
  }),
  dirt: piece({
    kit: 'mini-forest',
    file: 'patch-dirt',
    bounds: { min: [-0.5, 0, -0.5], max: [0.5, 0.1, 0.5] },
    size: TOWN_SCALE,
    rest: 'top',
    placeholder: GROUND_PATCH,
  }),
  water: piece({
    kit: 'fantasy-town-kit',
    file: 'fountain-center',
    bounds: { min: [-0.5, 0, -0.5], max: [0.5, 0.14, 0.5] },
    size: TOWN_SCALE,
    rest: 'top',
    placeholder: 'No water tile in the atlas-style kits; the fountain basin stands in until a pond GLB is sourced (#116 on hold).',
  }),
}

const AUTOTILES = {
  'fence:end': fenceRun('No fence end post in Fantasy Town; a north–south run stands in (it also reaches south).'),
  'fence:straight': fenceRun(),
  'fence:corner': piece({
    kit: 'fantasy-town-kit',
    file: 'fence-curved',
    bounds: { min: [-0.5, 0, -0.5], max: [0.5, 0.38, 0.5] },
    size: TOWN_SCALE,
    quarterTurns: 2,
    placeholder:
      'Fantasy Town has no centre-line corner. Its arc, turned to join north and east, meets those edges 0.46 off the centre line, so it leaves a gap beside centred straights.',
  }),
  'fence:tee': fenceRun('No fence tee in Fantasy Town; a north–south run stands in (the east branch is missing).'),
  'fence:cross': fenceRun('No fence cross in Fantasy Town; a north–south run stands in (east and west are missing).'),
  'path:end': roadTile(),
  'path:straight': roadTile(),
  'path:corner': roadTile(),
  'path:tee': roadTile(),
  'path:cross': roadTile(),
} as const satisfies Readonly<Record<`${'fence' | 'path'}:${string}`, PieceModel>>

const STRUCTURES = {
  'fence-gate': piece({
    kit: 'fantasy-town-kit',
    file: 'fence-gate',
    bounds: FENCE_BOUNDS,
    size: TOWN_SCALE,
    anchor: 'centre',
  }),
  'building-wall': wall('wall-wood', BUILDING_GAP),
  'building-wall-door': wall('wall-wood-door', BUILDING_GAP),
  'building-wall-window': wall('wall-wood-window-shutters', BUILDING_GAP),
  'building-roof': piece({
    kit: 'fantasy-town-kit',
    file: 'roof-gable',
    // The ridge already runs east–west, the convention: no turn needed.
    bounds: { min: [-0.55, 0, -0.535], max: [0.55, 0.571, 0.535] },
    size: TOWN_SCALE,
    placeholder: BUILDING_GAP,
  }),
}

const DECOR = {
  tree: piece({
    kit: 'fantasy-town-kit',
    file: 'tree',
    bounds: { min: [-0.512, 0, -0.512], max: [0.512, 2.413, 0.512] },
    size: TOWN_SCALE,
  }),
  'tree-tall': piece({
    kit: 'fantasy-town-kit',
    file: 'tree-high',
    bounds: { min: [-0.512, 0, -0.512], max: [0.512, 2.973, 0.512] },
    size: TOWN_SCALE,
  }),
  bush: piece({
    kit: 'mini-forest',
    file: 'plant',
    bounds: { min: [-0.148, -0.017, -0.215], max: [0.249, 0.175, 0.215] },
    size: { scale: 1.5 },
  }),
  rock: piece({
    kit: 'survival-kit',
    file: 'rock-a',
    bounds: { min: [-0.3, 0, -0.297], max: [0.255, 0.393, 0.324] },
    size: SURVIVAL_SCALE,
  }),
  crate: piece({
    kit: 'survival-kit',
    file: 'box',
    bounds: { min: [-0.125, 0, -0.125], max: [0.125, 0.25, 0.125] },
    size: SURVIVAL_SCALE,
  }),
  barrel: piece({
    kit: 'survival-kit',
    file: 'barrel',
    bounds: { min: [-0.118, 0, -0.118], max: [0.118, 0.344, 0.118] },
    size: SURVIVAL_SCALE,
  }),
  'hay-bale': piece({
    kit: 'survival-kit',
    file: 'box-large',
    bounds: { min: [-0.125, 0, -0.25], max: [0.125, 0.25, 0.25] },
    size: SURVIVAL_SCALE,
    placeholder: 'No hay bale in any atlas-style kit; a long wooden crate stands in until one is sourced (#116 on hold).',
  }),
  crop: piece({
    kit: 'food-kit',
    file: 'cabbage',
    bounds: { min: [-0.19, 0, -0.202], max: [0.19, 0.307, 0.202] },
    size: TOWN_SCALE,
  }),
}

const HOTSPOTS = {
  'hotspot:barn': piece({
    kit: 'fantasy-town-kit',
    file: 'wall-wood-doorway-square-wide',
    bounds: WALL_BOUNDS,
    size: TOWN_SCALE,
    quarterTurns: 3,
    placeholder: HOTSPOT_GAP,
  }),
  'hotspot:feed-shed': piece({
    kit: 'food-kit',
    file: 'bag',
    bounds: { min: [-0.11, 0, -0.206], max: [0.11, 0.6, 0.206] },
    size: TOWN_SCALE,
    placeholder: HOTSPOT_GAP,
  }),
  'hotspot:nest': piece({
    kit: 'food-kit',
    file: 'egg',
    bounds: { min: [-0.058, 0, -0.067], max: [0.058, 0.165, 0.067] },
    size: TOWN_SCALE,
    placeholder: HOTSPOT_GAP,
  }),
  'hotspot:paddock': STRUCTURES['fence-gate'],
  'hotspot:training-ring': piece({
    kit: 'survival-kit',
    file: 'signpost',
    bounds: { min: [-0.112, 0, -0.018], max: [0.102, 0.46, 0.025] },
    size: SURVIVAL_SCALE,
    placeholder: HOTSPOT_GAP,
  }),
  'hotspot:petting-zoo': piece({
    kit: 'fantasy-town-kit',
    file: 'stall-bench',
    bounds: { min: [-0.13, 0, -0.47], max: [0.13, 0.226, 0.47] },
    size: TOWN_SCALE,
    placeholder: HOTSPOT_GAP,
  }),
  'hotspot:farmhouse': STRUCTURES['building-wall-door'],
}

/** Keyed by the tile world's `PieceId` strings; retype as `Record<PieceId, …>` from `@sf/world` once SF-87 merges. */
export const KENNEY_CATALOGUE: Readonly<Record<PieceId, PieceModel>> = {
  ...GROUND,
  ...AUTOTILES,
  ...STRUCTURES,
  ...DECOR,
  ...HOTSPOTS,
}

export const KENNEY_ANIMALS: Readonly<Record<AnimalSpecies, PieceModel>> = {
  cow: animal('animal-cow', { min: [-0.77, 0, -0.625], max: [0.77, 1.612, 0.835] }, 1.3),
  pig: animal('animal-pig', { min: [-0.625, 0, -0.625], max: [0.625, 1.584, 0.835] }, 0.9),
  hog: animal('animal-hog', { min: [-0.675, 0, -0.625], max: [0.675, 1.516, 0.876] }, 0.9),
  chick: animal('animal-chick', { min: [-1.098, 0, -0.625], max: [1.098, 1.594, 0.725] }, 0.5),
  bunny: animal('animal-bunny', { min: [-0.625, 0, -0.625], max: [0.625, 2.01, 0.705] }, 0.6),
  dog: animal('animal-dog', { min: [-0.625, 0, -0.625], max: [0.635, 1.584, 0.876] }, 0.7),
}

export const KENNEY_KEEPERS: Readonly<Record<KeeperVariant, PieceModel>> = {
  'female-a': keeper('character-female-a', { min: [-0.549, 0, -0.292], max: [0.549, 0.776, 0.208] }),
  'female-c': keeper('character-female-c', { min: [-0.384, 0, -0.292], max: [0.384, 0.776, 0.208] }),
  'male-a': keeper('character-male-a', { min: [-0.384, 0, -0.172], max: [0.384, 0.671, 0.168] }),
  'male-c': keeper('character-male-c', { min: [-0.384, 0, -0.188], max: [0.384, 0.793, 0.273] }),
}
