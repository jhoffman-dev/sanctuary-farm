import type { FarmSummary } from '@sf/application'

type HudProps = {
  summary: FarmSummary
  onToggleMute: () => void
}

const pill = 'rounded-full bg-white/90 px-4 py-2 text-lg font-bold text-stone-800 shadow'

export function Hud({ summary, onToggleMute }: HudProps) {
  return (
    <header className="pointer-events-auto flex items-center gap-3 p-3" aria-label="Farm status">
      <span className={pill}>
        <span aria-hidden>🪙</span> <span className="sr-only">Coins:</span>
        <span data-testid="coins">{summary.coins}</span>
      </span>
      <span className={pill}>
        <span aria-hidden>🌾</span> <span className="sr-only">Feed:</span>
        <span data-testid="feed">{summary.feed}</span>
      </span>
      <button
        type="button"
        onClick={onToggleMute}
        aria-pressed={summary.muted}
        aria-label={summary.muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
        data-testid="mute"
        className={`${pill} ml-auto min-h-12 min-w-12 cursor-pointer`}
      >
        <span aria-hidden>{summary.muted ? '🔇' : '🔊'}</span>
      </button>
    </header>
  )
}
