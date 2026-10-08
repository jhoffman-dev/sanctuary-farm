/** The dev route that opens the world editor instead of the game. */
export function isWorldEditorRoute(search: string): boolean {
  return new URLSearchParams(search).get('edit') === '1'
}
