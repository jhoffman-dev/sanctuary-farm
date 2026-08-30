import { useState } from 'react'
import { FEED_BUNDLE_PRICE, FEED_BUNDLE_UNITS } from '@/contracts'
import { useGame } from '../gameState'

export function FeedShedScreen() {
  const { save, buyFeed, back } = useGame()
  const [flash, setFlash] = useState<'ok' | 'broke' | null>(null)
  const canAfford = save.coins >= FEED_BUNDLE_PRICE

  return (
    <div className="min-h-dvh">
      <header className="p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Farmyard
        </button>
      </header>

      <div className="mx-auto max-w-sm space-y-5 p-6 text-center">
        <div className="text-5xl">🏚️</div>
        <h1 className="text-xl font-semibold">Feed shed</h1>

        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-lg">
            🪙 <b>{save.coins}</b> coins &nbsp;·&nbsp; 🌾 <b>{save.feed}</b> feed
          </p>
        </div>

        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-3xl">🌾 ×{FEED_BUNDLE_UNITS}</p>
          <p className="mt-1 text-sm text-stone-600">a sack of feed</p>
          <button
            type="button"
            disabled={!canAfford}
            onClick={() => {
              const ok = buyFeed()
              setFlash(ok ? 'ok' : 'broke')
            }}
            className="mt-3 rounded-lg bg-emerald-400 px-6 py-2 font-semibold text-emerald-950 disabled:bg-stone-200 disabled:text-stone-400"
          >
            Buy for 🪙 {FEED_BUNDLE_PRICE}
          </button>
          {flash === 'ok' ? (
            <p className="mt-2 text-sm text-emerald-700">Added {FEED_BUNDLE_UNITS} feed.</p>
          ) : flash === 'broke' ? (
            <p className="mt-2 text-sm text-rose-600">Not enough coins — answer more questions!</p>
          ) : null}
        </div>

        <p className="text-xs text-stone-500">
          Coins are earned by answering questions. Feed is used when you feed an animal.
        </p>
      </div>
    </div>
  )
}
