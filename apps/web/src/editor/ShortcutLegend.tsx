import { CAMERA_MOVES, SHORTCUTS } from './editor-keys'

/** The shortcuts, from the same table the key handler reads, so the legend cannot drift. */
export function ShortcutLegend() {
  const rows = [...SHORTCUTS.map(({ keys, does }) => ({ keys, does })), ...CAMERA_MOVES]
  return (
    <section aria-labelledby="shortcuts" className="border-t border-stone-300 pt-3">
      <h3 id="shortcuts" className="mb-1 text-[11px] font-bold tracking-wide text-stone-500 uppercase">
        Shortcuts
      </h3>
      <dl className="flex flex-col gap-0.5 text-[11px]">
        {rows.map(({ keys, does }) => (
          <div key={keys} className="flex items-baseline gap-1.5">
            <dt className="shrink-0">
              <kbd className="rounded border border-stone-300 bg-white px-1 font-mono whitespace-nowrap">{keys}</kbd>
            </dt>
            <dd className="text-stone-600">{does}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
