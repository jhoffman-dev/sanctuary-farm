import { PALETTE, PALETTE_GROUPS } from './palette-entries'
import { type Tool, sameTool } from './editor-tools'

/** The chosen entry's note, spelled out — a tooltip alone is easy to miss. */
function ActiveNote({ tool }: { tool: Tool }) {
  const note = PALETTE.find((entry) => sameTool(entry.tool, tool))?.note
  return note ? <p className="rounded bg-sky-50 px-2 py-1 text-[11px] text-sky-900">{note}</p> : null
}

type PaletteProps = { tool: Tool; onChoose: (tool: Tool) => void }

/** Every piece the world can hold, grouped as James would look for it. Choosing one picks its tool. */
export function Palette({ tool, onChoose }: PaletteProps) {
  return (
    <nav aria-label="Palette" className="flex flex-col gap-3">
      {PALETTE_GROUPS.map((group) => (
        <section key={group} aria-labelledby={`palette-${group}`}>
          <h3 id={`palette-${group}`} className="mb-1 text-[11px] font-bold tracking-wide text-stone-500 uppercase">
            {group}
          </h3>
          <ul className="grid grid-cols-2 gap-0.5">
            {PALETTE.filter((entry) => entry.group === group).map((entry) => {
              const active = sameTool(entry.tool, tool)
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    data-testid={`palette-${entry.key}`}
                    aria-pressed={active}
                    title={entry.note ?? entry.label}
                    onClick={() => onChoose(entry.tool)}
                    className={`w-full rounded px-1.5 py-0.5 text-left font-semibold ${active ? 'bg-sky-600 text-white' : 'hover:bg-stone-200'}`}
                  >
                    {entry.label}
                    {entry.note && <span className={`ml-1 text-[10px] ${active ? 'text-sky-100' : 'text-stone-400'}`}>ⓘ</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <ActiveNote tool={tool} />
    </nav>
  )
}
