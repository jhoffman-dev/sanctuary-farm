// Prints the Godot web export's size table and checks it against the
// ceilings in budget.ts; exits 1 when a line is over (SF-100). Markdown, so
// CI can append it to the job summary.
//
// Usage: node game/tools/web_export/run_export_size.ts [export-dir]   (default game/build/web)
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { EXPORT_CEILINGS } from './budget.ts'
import { ceilingTable, checkCeilings, sizeOf, sizeTable } from './export_size.ts'

const exportDir = process.argv[2] ?? 'game/build/web'

const sizes = readdirSync(exportDir)
  .sort()
  .map((name) => sizeOf({ name, bytes: readFileSync(join(exportDir, name)) }))
const results = checkCeilings(sizes, EXPORT_CEILINGS)

console.log(sizeTable(sizes))
console.log()
console.log(ceilingTable(results))

const over = results.filter((result) => !result.withinCeiling)
if (over.length > 0) {
  console.error(`\nOver the ceiling in docs/performance-budget.md: ${over.map((result) => result.label).join(', ')}`)
  process.exitCode = 1
}
