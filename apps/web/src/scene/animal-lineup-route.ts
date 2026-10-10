/** The dev route that renders each animal alone at the game's camera angle, for the 64-px identification check. */
export function isAnimalLineupRoute(search: string): boolean {
  return new URLSearchParams(search).get('animals') === '1'
}
