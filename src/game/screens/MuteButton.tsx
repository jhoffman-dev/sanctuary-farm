import { useGame } from '../gameState'

export function MuteButton() {
  const { save, setMuted } = useGame()
  const muted = save.settings.muted
  return (
    <button
      type="button"
      aria-label={muted ? 'Unmute' : 'Mute'}
      className="rounded-full bg-white/80 px-3 py-1 text-sm shadow"
      onClick={() => setMuted(!muted)}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
