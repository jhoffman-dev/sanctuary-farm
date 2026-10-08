import type { TileCoord, TileWorld, WorldOverrides } from '@sf/world'
import { type InspectorRow, inspectorRows } from './inspector-rows'

type InspectorProps = {
  world: TileWorld
  overrides: WorldOverrides
  selected: TileCoord | null
  onRevert: (at: TileCoord) => void
}

const SOURCE_STYLE: Record<NonNullable<InspectorRow['source']>, string> = {
  generated: 'bg-stone-200 text-stone-600',
  layout: 'bg-stone-200 text-stone-600',
  overridden: 'bg-amber-200 text-amber-900',
  moved: 'bg-amber-200 text-amber-900',
}

function slug(label: string): string {
  return label.toLowerCase()
}

/** The selected tile, layer by layer, and whether each layer is generated or James's override. */
export function Inspector({ world, overrides, selected, onRevert }: InspectorProps) {
  const rows = selected && inspectorRows(world, overrides, selected)
  const anyOverride = rows?.some((row) => row.source === 'overridden') ?? false
  return (
    <section aria-labelledby="inspector" data-testid="inspector" className="flex flex-col gap-2">
      <h2 id="inspector" className="text-[11px] font-bold tracking-wide text-stone-500 uppercase">
        Inspector
      </h2>
      {!selected && <p className="text-stone-500">Select a tile (V, then click) to see what is on it.</p>}
      {selected && !rows && <p className="text-stone-500">That tile is off the land.</p>}
      {rows && (
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-1">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="font-semibold text-stone-600">{row.label}</dt>
              <dd className="flex flex-wrap items-baseline gap-1" data-testid={`inspector-${slug(row.label)}`}>
                <span>{row.value}</span>
                {row.source && (
                  <span data-testid={`inspector-${slug(row.label)}-source`} className={`rounded px-1 text-[10px] font-bold ${SOURCE_STYLE[row.source]}`}>
                    {row.source}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {selected && rows && (
        <button
          type="button"
          disabled={!anyOverride}
          onClick={() => onRevert(selected)}
          className="self-start rounded border border-stone-300 bg-white px-2 py-1 disabled:opacity-40"
        >
          Revert tile to generated
        </button>
      )}
    </section>
  )
}
