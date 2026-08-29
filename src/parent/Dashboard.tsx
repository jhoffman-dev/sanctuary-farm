// STUB — Track E replaces with the real 12×12 heatmap + slowest facts + trends.
import type { SaveData } from '@/contracts'

export type DashboardProps = {
  save: SaveData
  onExport: () => void
  onReset: () => void
  onClose: () => void
}

export function Dashboard({ save, onExport, onReset, onClose }: DashboardProps) {
  const factCount = Object.keys(save.facts).length
  return (
    <div data-stub="Dashboard" className="space-y-2 p-4">
      <h2 className="text-lg font-semibold">Parent dashboard (stub)</h2>
      <p className="text-sm opacity-70">
        {factCount} facts tracked · {save.globalCounter} questions answered ·{' '}
        {save.sessions.length} sessions
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onExport}>export</button>
        <button type="button" onClick={onReset}>reset</button>
        <button type="button" onClick={onClose}>close</button>
      </div>
    </div>
  )
}
