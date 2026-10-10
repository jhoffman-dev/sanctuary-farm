import { describe, expect, it } from 'vitest'
import { KENNEY_ANIMALS, KENNEY_CATALOGUE, KENNEY_KEEPERS } from '../world-assets'
import { ALL_LABELS, CATALOGUE_ROWS, catalogueModel, layoutCatalogue, missingFromRows } from './catalogue-grid'

describe('the catalogue grid', () => {
  it('shows every piece, animal and keeper exactly once', () => {
    expect(missingFromRows(CATALOGUE_ROWS)).toEqual([])
    const shown = CATALOGUE_ROWS.flat()
    expect(new Set(shown).size).toBe(shown.length)
    expect(shown).toHaveLength(ALL_LABELS.length)
  })

  it('reports a label the rows leave out', () => {
    expect(missingFromRows([['tree']])).toContain('animal:cow')
  })

  it('resolves each label to its catalogue entry', () => {
    expect(catalogueModel('fence:corner')).toBe(KENNEY_CATALOGUE['fence:corner'])
    expect(catalogueModel('animal:cow')).toBe(KENNEY_ANIMALS.cow)
    expect(catalogueModel('keeper:male-a')).toBe(KENNEY_KEEPERS['male-a'])
  })

  it('lays rows east and stacks them south, centred on the origin', () => {
    expect(layoutCatalogue([['tree', 'rock', 'crate'], ['bush']], 2)).toEqual([
      { label: 'tree', x: -2, z: -1 },
      { label: 'rock', x: 0, z: -1 },
      { label: 'crate', x: 2, z: -1 },
      { label: 'bush', x: -2, z: 1 },
    ])
  })
})
