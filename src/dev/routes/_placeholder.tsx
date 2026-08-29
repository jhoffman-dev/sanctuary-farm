// Shared placeholder body for a dev route before its track has landed.
export function DevPlaceholder({ track, note }: { track: string; note?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-400 p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">{track}</p>
      <p className="mt-1 text-stone-600">Dev route registered. Track implementation pending.</p>
      {note ? <p className="mt-2 text-sm text-stone-500">{note}</p> : null}
    </div>
  )
}
