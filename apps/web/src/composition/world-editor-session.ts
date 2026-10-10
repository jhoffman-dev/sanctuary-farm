import { createRng } from '@sf/application'
import { anchorsFromLayout, loadFarmLayout, loadWorldOverrides, loadWorldSettings } from '@sf/world'
import type { WorldEditorSession } from '../editor/editor-session'

/** A fresh unsigned 32-bit seed for "Random seed". The browser's CSPRNG is the adapter; nothing here needs to be reproducible. */
function randomSeed(): number {
  const [seed] = crypto.getRandomValues(new Uint32Array(1))
  return seed ?? 0
}

/** The world editor's starting point: the shipped layout, overrides and settings, and the game's own seeded RNG. */
export function worldEditorSession(): WorldEditorSession {
  return {
    anchors: anchorsFromLayout(loadFarmLayout()),
    saved: { settings: loadWorldSettings(), overrides: loadWorldOverrides() },
    rngFor: createRng,
    randomSeed,
  }
}
