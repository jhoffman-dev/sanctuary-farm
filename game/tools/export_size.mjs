// Reports the Godot web export's transfer size: raw, gzip (level 9) and brotli
// (quality 11) per file and in total, as a Markdown table. ADR-0006 tracks
// these until performance-budget.md has Godot lines to enforce.
//
// Usage: node game/tools/export_size.mjs [export-dir]   (default game/build/web)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const exportDir = process.argv[2] ?? 'game/build/web'
const files = ['index.wasm', 'index.pck', 'index.js', 'index.html']

const megabytes = (bytes) => (bytes / 1_000_000).toFixed(2)

const sizeOf = (name) => {
  const bytes = readFileSync(join(exportDir, name))
  return {
    name,
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    // Window 24 matches the `brotli` CLI's default; zlib's own default (22) reads ~3 % larger.
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 },
    }).length,
  }
}

const rows = files.map(sizeOf)
const total = rows.reduce(
  (sum, row) => ({ name: '**total**', raw: sum.raw + row.raw, gzip: sum.gzip + row.gzip, brotli: sum.brotli + row.brotli }),
  { raw: 0, gzip: 0, brotli: 0 },
)

console.log('| File | Raw (MB) | gzip -9 (MB) | brotli 11 (MB) |')
console.log('| --- | --- | --- | --- |')
for (const row of [...rows, total]) {
  console.log(`| ${row.name} | ${megabytes(row.raw)} | ${megabytes(row.gzip)} | ${megabytes(row.brotli)} |`)
}
