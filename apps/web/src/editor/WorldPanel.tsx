import { MAX_WORLD_SEED } from '@sf/world'
import { useState } from 'react'

type WorldPanelProps = {
  seed: number
  chunkCount: number
  onSeed: (seed: number) => void
  onRandomSeed: () => void
  onCopyOverrides: () => void
  onCopyWorld: () => void
}

/** Keyed by the seed, so a new seed from undo or "Random seed" resets what is typed. */
function SeedForm({ seed, onSeed }: { seed: number; onSeed: (seed: number) => void }) {
  const [typed, setTyped] = useState(String(seed))

  const apply = () => {
    const value = Number(typed)
    if (typed.trim() !== '' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_WORLD_SEED) onSeed(value)
    else setTyped(String(seed))
  }

  return (
    <form
      className="flex items-end gap-1"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <label className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold text-stone-600">Seed</span>
        <input
          data-testid="seed-input"
          inputMode="numeric"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={apply}
          className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono"
        />
      </label>
      <button type="submit" className="rounded border border-stone-300 bg-white px-2 py-1">
        Apply
      </button>
    </form>
  )
}

/** The world's generation inputs (seed, land) and the copy-to-clipboard fallback for saving. */
export function WorldPanel({ seed, chunkCount, onSeed, onRandomSeed, onCopyOverrides, onCopyWorld }: WorldPanelProps) {
  return (
    <section aria-labelledby="world-settings" className="flex flex-col gap-2 border-t border-stone-300 pt-3">
      <h2 id="world-settings" className="text-[11px] font-bold tracking-wide text-stone-500 uppercase">
        World
      </h2>
      <SeedForm key={seed} seed={seed} onSeed={onSeed} />
      <button type="button" data-testid="random-seed" onClick={onRandomSeed} className="self-start rounded border border-stone-300 bg-white px-2 py-1">
        Random seed
      </button>
      <p className="text-[11px] text-stone-500">
        A new seed regenerates paths, ponds and trees. Your painted tiles, placed pieces and hotspot moves are kept.
      </p>
      <p>
        <span className="font-semibold text-stone-600">Land:</span> {chunkCount} chunks of 16 × 16.{' '}
        <span className="text-[11px] text-stone-500">Add land (L), then click a blue outline.</span>
      </p>
      <div className="flex flex-col gap-1 border-t border-stone-300 pt-2">
        <p className="text-[11px] break-words text-stone-500">
          Save writes <code className="break-all">packages/world/layouts/overrides.json</code> and <code>world.json</code>. If the dev server
          can’t, copy them by hand:
        </p>
        <div className="flex gap-1">
          <button type="button" data-testid="copy-overrides" onClick={onCopyOverrides} className="rounded border border-stone-300 bg-white px-2 py-1">
            Copy overrides JSON
          </button>
          <button type="button" data-testid="copy-world" onClick={onCopyWorld} className="rounded border border-stone-300 bg-white px-2 py-1">
            Copy world JSON
          </button>
        </div>
      </div>
    </section>
  )
}
