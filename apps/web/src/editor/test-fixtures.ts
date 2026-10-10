import { createRng } from '@sf/application'
import { NO_OVERRIDES, anchorsFromLayout, loadFarmLayout, loadWorldSettings } from '@sf/world'
import type { WorldEditorSession } from './editor-session'

/** The shipped farm with no overrides, and a "random" seed that is always the same. */
export function testSession(randomSeed = 4242): WorldEditorSession {
  return {
    anchors: anchorsFromLayout(loadFarmLayout()),
    saved: { settings: loadWorldSettings(), overrides: NO_OVERRIDES },
    rngFor: createRng,
    randomSeed: () => randomSeed,
  }
}
