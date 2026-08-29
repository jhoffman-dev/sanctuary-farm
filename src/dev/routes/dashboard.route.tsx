// TRACK E owns this file. Render the parent Dashboard against a generated fixture.
import type { DevRoute } from './_registry'
import { useMemo, useState } from 'react'
import { Dashboard } from '@/parent/Dashboard'
import { buildDemoSave } from '@/parent/__fixtures__/demoSave'

function DashboardDevRoute() {
  const [seed, setSeed] = useState(0)
  const [now] = useState(() => Date.now())
  const save = useMemo(() => buildDemoSave(now - seed), [now, seed])
  const [exported, setExported] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded bg-stone-200 px-3 py-1.5 text-sm hover:bg-stone-300"
          onClick={() => setSeed((s) => s + 1)}
        >
          Regenerate fixture
        </button>
        {exported ? <span className="text-xs text-stone-500">exported {exported.length} chars (see console)</span> : null}
      </div>
      <Dashboard
        save={save}
        onExport={() => {
          const json = JSON.stringify(save, null, 2)
          setExported(json)
          console.log(json)
        }}
        onReset={() => console.log('reset')}
        onClose={() => console.log('close')}
      />
    </div>
  )
}

export default {
  path: '#/dev/dashboard',
  label: 'Parent dashboard',
  order: 60,
  Component: DashboardDevRoute,
} satisfies DevRoute
