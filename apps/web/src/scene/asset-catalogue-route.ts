/** The dev route that shows every catalogue piece instead of the game. */
export function isAssetCatalogueRoute(search: string): boolean {
  return new URLSearchParams(search).get('assets') === '1'
}
