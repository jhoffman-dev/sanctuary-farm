import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion(): boolean {
  // matchMedia is absent in jsdom and some embedded webviews; treat that as
  // "no preference" rather than crashing the scene.
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

/** Tracks the OS/browser reduced-motion preference, live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(QUERY)
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}
