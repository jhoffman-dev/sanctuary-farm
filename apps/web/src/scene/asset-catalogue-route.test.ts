import { describe, expect, it } from 'vitest'
import { isAssetCatalogueRoute } from './asset-catalogue-route'

describe('isAssetCatalogueRoute', () => {
  it('is on only for ?assets=1', () => {
    expect(isAssetCatalogueRoute('?assets=1')).toBe(true)
    expect(isAssetCatalogueRoute('?dev=1&assets=1')).toBe(true)
    expect(isAssetCatalogueRoute('')).toBe(false)
    expect(isAssetCatalogueRoute('?assets=0')).toBe(false)
    expect(isAssetCatalogueRoute('?assets')).toBe(false)
  })
})
