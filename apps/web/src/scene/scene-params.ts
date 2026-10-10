import { DEV_VIEW_NAMES, type DevViewName } from './camera-views'
import { isQualityTier, type QualityTier } from './quality-tier'

export type SceneParams = {
  /** `?perf=1`: publish draw calls, FPS and hotspot screen positions onto the DOM (performance budget). */
  readonly perf: boolean
  /** `?view=…`, dev builds only: a camera for checking the world by eye. */
  readonly view: DevViewName | null
  /** `?quality=low|high`, in any build: skip the tier probe and draw this tier (not remembered). */
  readonly quality: QualityTier | null
}

function isDevViewName(value: string | null): value is DevViewName {
  return DEV_VIEW_NAMES.some((name) => name === value)
}

/** Reads the scene's query parameters. `dev` is `import.meta.env.DEV`, passed in so this stays testable. */
export function sceneParams(search: string, dev: boolean): SceneParams {
  const query = new URLSearchParams(search)
  const view = query.get('view')
  const quality = query.get('quality')
  return {
    perf: query.get('perf') === '1',
    view: dev && isDevViewName(view) ? view : null,
    quality: isQualityTier(quality) ? quality : null,
  }
}
