// TRACK E owns this file. Render the parent Dashboard against generated fixture data.
import type { DevRoute } from './_registry'
import { Dashboard } from '@/parent/Dashboard'
import { emptySave } from '@/save/store'

function DashboardDevRoute() {
  const save = emptySave()
  return (
    <Dashboard
      save={save}
      onExport={() => console.log('export')}
      onReset={() => console.log('reset')}
      onClose={() => console.log('close')}
    />
  )
}

export default {
  path: '#/dev/dashboard',
  label: 'Parent dashboard',
  order: 60,
  Component: DashboardDevRoute,
} satisfies DevRoute
