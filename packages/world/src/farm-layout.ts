import farmLayoutDocument from '../layouts/farm.json'
import { parseFarmLayout } from './parse-farm-layout'
import type { WorldLayout } from './world-layout'

/**
 * `layouts/farm.json` is bundled, so it is parsed once at module load rather
 * than fetched. A layout that fails its own rules is a broken build, not a bad
 * input — the gate's rule tests catch it long before a player would.
 */
const parsed = parseFarmLayout(farmLayoutDocument)

export function loadFarmLayout(): WorldLayout {
  if (!parsed.ok) throw new Error(`layouts/farm.json is not a valid layout — ${parsed.reason}`)
  return parsed.layout
}
