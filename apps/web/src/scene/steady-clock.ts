import { Clock } from 'three'
import { capFrameSeconds } from './frameloop'

/**
 * The scene's clock: three's `Clock`, but no frame's delta is longer than
 * `MAX_FRAME_SECONDS`. Installed as r3f's clock, so every `useFrame` — the
 * keeper's walk, the camera's ease, the animation mixers — gets the cap.
 */
export class SteadyClock extends Clock {
  override getDelta(): number {
    return capFrameSeconds(super.getDelta())
  }
}
