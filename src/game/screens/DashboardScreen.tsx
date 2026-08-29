import { useState } from 'react'
import { Dashboard } from '@/parent/Dashboard'
import { useGame } from '../gameState'

export function DashboardScreen() {
  const { save, back, exportSave, resetSave } = useGame()
  const [copied, setCopied] = useState(false)

  function onExport() {
    const json = exportSave()
    navigator.clipboard?.writeText(json).then(
      () => setCopied(true),
      () => setCopied(false),
    )
    // eslint-disable-next-line no-console
    console.log(json)
  }

  return (
    <div>
      <Dashboard save={save} onExport={onExport} onReset={resetSave} onClose={back} />
      {copied ? (
        <p className="p-3 text-center text-sm text-emerald-700">Save copied to the clipboard.</p>
      ) : null}
    </div>
  )
}
