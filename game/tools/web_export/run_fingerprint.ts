// Content-hashes a Godot web export in place (see fingerprint.ts).
// Usage: node game/tools/web_export/run_fingerprint.ts [export-dir]   (default game/build/web)
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planFingerprint } from './fingerprint.ts'

const exportDir = process.argv[2] ?? 'game/build/web'
const pagePath = join(exportDir, 'index.html')

const files = readdirSync(exportDir)
  .filter((name) => name !== 'index.html')
  .map((name) => ({ name, bytes: readFileSync(join(exportDir, name)) }))
const plan = planFingerprint(readFileSync(pagePath, 'utf8'), files)

for (const [from, to] of plan.renames) {
  if (from !== to) renameSync(join(exportDir, from), join(exportDir, to))
  console.log(`${from} -> ${to}`)
}
writeFileSync(pagePath, plan.html)
