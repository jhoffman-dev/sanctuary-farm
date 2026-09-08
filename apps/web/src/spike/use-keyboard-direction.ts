import { useEffect, useRef, type RefObject } from 'react'
import type { GroundVector } from './steering'

/** Screen-relative intent, before the camera's yaw is applied. */
const KEY_DIRECTIONS: Readonly<Record<string, GroundVector>> = {
  ArrowUp: { x: 0, z: -1 },
  KeyW: { x: 0, z: -1 },
  ArrowDown: { x: 0, z: 1 },
  KeyS: { x: 0, z: 1 },
  ArrowLeft: { x: -1, z: 0 },
  KeyA: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  KeyD: { x: 1, z: 0 },
}

function sumHeld(held: ReadonlySet<string>): GroundVector | null {
  let x = 0
  let z = 0
  for (const code of held) {
    const direction = KEY_DIRECTIONS[code]
    if (!direction) continue
    x += direction.x
    z += direction.z
  }
  return x === 0 && z === 0 ? null : { x, z }
}

/**
 * The direction the held keys are asking for, as a ref so the render loop can
 * read it without a React commit per keystroke. Null when nothing is held.
 *
 * The vector is in *screen* space (up = away from the camera); the caller
 * rotates it into world space by the camera's yaw.
 */
export function useKeyboardDirection(): RefObject<GroundVector | null> {
  const direction = useRef<GroundVector | null>(null)

  useEffect(() => {
    const held = new Set<string>()
    const update = () => {
      direction.current = sumHeld(held)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.code in KEY_DIRECTIONS)) return
      // Arrow keys scroll the page otherwise, which fights the walk.
      event.preventDefault()
      held.add(event.code)
      update()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      held.delete(event.code)
      update()
    }
    // A tab-away never delivers keyup, so the keeper would walk forever.
    const onBlur = () => {
      held.clear()
      update()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return direction
}
