import type { TileWorld } from '@sf/world'

/**
 * The world's generator and layouts are fetched with the scenery, not with the
 * first question (performance budget rule 1: practice first), so the shell
 * only holds this loader. Vite names the chunk `build-farm-world-*.js`.
 */
export async function loadFarmWorld(): Promise<TileWorld> {
  const { buildFarmWorld } = await import('./build-farm-world')
  return buildFarmWorld()
}
