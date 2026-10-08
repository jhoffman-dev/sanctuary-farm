import { type RefObject, useEffect, useRef } from 'react'
import { KEY_DIRECTIONS } from './keyboard-step'

/**
 * The movement keys held right now, as a ref so the frame loop reads them
 * without a React commit per keystroke. `onChange` lets a `demand` frameloop
 * wake up when a key goes down.
 */
export function useHeldKeys(onChange: () => void): RefObject<ReadonlySet<string>> {
  const held = useRef(new Set<string>())

  useEffect(() => {
    const keys = held.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.code in KEY_DIRECTIONS)) return
      // Arrow keys scroll the page otherwise, which fights the walk.
      event.preventDefault()
      keys.add(event.code)
      onChange()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code)
    }
    // A tab-away never delivers keyup, so the keeper would walk for ever.
    const onBlur = () => keys.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [onChange])

  return held
}
