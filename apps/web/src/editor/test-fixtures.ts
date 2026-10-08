import { NO_OVERRIDES, anchorsFromLayout, loadFarmLayout, loadWorldSettings } from '@sf/world'
import { createSeededRng } from '../composition/seeded-rng'
import type { WorldEditorSession } from './editor-session'

/** The shipped farm with no overrides, and a "random" seed that is always the same. */
export function testSession(randomSeed = 4242): WorldEditorSession {
  return {
    anchors: anchorsFromLayout(loadFarmLayout()),
    saved: { settings: loadWorldSettings(), overrides: NO_OVERRIDES },
    rngFor: createSeededRng,
    randomSeed: () => randomSeed,
  }
}
