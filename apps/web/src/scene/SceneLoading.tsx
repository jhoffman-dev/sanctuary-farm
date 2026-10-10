import { useReducedMotion } from '../a11y/use-reduced-motion'

const RING = 'h-4 w-4 rounded-full border-2 border-stone-300 border-t-stone-600'

/**
 * Says the scenery is on its way. Sits below the HUD and above the number pad,
 * so it never covers anything the player is using — the farm is playable while
 * this is on screen. Game rule 8: a player who asked for reduced motion gets a
 * still ring, not a slower one.
 */
export function SceneLoading() {
  const spin = !useReducedMotion()

  return (
    <div className="absolute inset-x-0 top-24 flex justify-center">
      <p
        role="status"
        data-testid="scene-loading"
        className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700"
      >
        <span aria-hidden data-testid="scene-loading-ring" className={spin ? `${RING} animate-spin` : RING} />
        Building the farm…
      </p>
    </div>
  )
}
