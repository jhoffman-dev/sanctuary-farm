import {
  ANIMAL_SPECIES,
  type AnimalSpecies,
  KEEPER_VARIANTS,
  type KeeperVariant,
  KENNEY_ANIMALS,
  KENNEY_CATALOGUE,
  KENNEY_KEEPERS,
  PIECE_IDS,
  type PieceId,
  type PieceModel,
} from '../world-assets'

/** What one cell of the `?assets=1` grid shows: a tile piece, an animal or a keeper. */
export type CatalogueLabel = PieceId | `animal:${AnimalSpecies}` | `keeper:${KeeperVariant}`

export const ALL_LABELS: readonly CatalogueLabel[] = [
  ...PIECE_IDS,
  ...ANIMAL_SPECIES.map((species) => `animal:${species}` as const),
  ...KEEPER_VARIANTS.map((variant) => `keeper:${variant}` as const),
]

export function catalogueModel(label: CatalogueLabel): PieceModel {
  if (label.startsWith('animal:')) return KENNEY_ANIMALS[label.slice('animal:'.length) as AnimalSpecies]
  if (label.startsWith('keeper:')) return KENNEY_KEEPERS[label.slice('keeper:'.length) as KeeperVariant]
  return KENNEY_CATALOGUE[label as PieceId]
}

/** One row per family, so a reviewer compares like with like in the screenshot. */
export const CATALOGUE_ROWS: readonly (readonly CatalogueLabel[])[] = [
  ['grass', 'dirt', 'water', 'building-wall', 'building-wall-door', 'building-wall-window', 'building-roof'],
  ['fence:end', 'fence:straight', 'fence:corner', 'fence:tee', 'fence:cross', 'fence-gate'],
  ['path:end', 'path:straight', 'path:corner', 'path:tee', 'path:cross'],
  ['tree', 'tree-tall', 'bush', 'rock', 'crate', 'barrel', 'hay-bale', 'crop'],
  [
    'hotspot:barn',
    'hotspot:feed-shed',
    'hotspot:nest',
    'hotspot:paddock',
    'hotspot:training-ring',
    'hotspot:petting-zoo',
    'hotspot:farmhouse',
  ],
  ['animal:cow', 'animal:pig', 'animal:hog', 'animal:chick', 'animal:bunny', 'animal:dog'],
  ['keeper:female-a', 'keeper:female-c', 'keeper:male-a', 'keeper:male-c'],
]

export type CatalogueCell = { readonly label: CatalogueLabel; readonly x: number; readonly z: number }

/** Cell centres on whole tiles, rows running east (+X) and stacked south (+Z), centred on the origin. */
export function layoutCatalogue(rows: readonly (readonly CatalogueLabel[])[], spacing: number): CatalogueCell[] {
  const columns = Math.max(...rows.map((row) => row.length))
  const left = -((columns - 1) * spacing) / 2
  const back = -((rows.length - 1) * spacing) / 2
  return rows.flatMap((row, rowIndex) =>
    row.map((label, column) => ({ label, x: left + column * spacing, z: back + rowIndex * spacing })),
  )
}

/** Labels the rows leave out — empty when the grid shows everything. */
export function missingFromRows(rows: readonly (readonly CatalogueLabel[])[]): CatalogueLabel[] {
  const shown = new Set(rows.flat())
  return ALL_LABELS.filter((label) => !shown.has(label))
}
