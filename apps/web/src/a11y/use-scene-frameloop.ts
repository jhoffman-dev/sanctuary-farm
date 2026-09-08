import { useReducedMotion } from './use-reduced-motion'

/** How react-three-fiber drives its render loop. 'demand' draws only when asked. */
export type SceneFrameloop = 'always' | 'demand'

/**
 * The render loop the 3D world should run. A player who asked for reduced
 * motion gets a still frame, not a slower sway (game rule 8) — so the rule
 * lives here, and the scene only wires the answer through.
 */
export function useSceneFrameloop(): SceneFrameloop {
  return useReducedMotion() ? 'demand' : 'always'
}
