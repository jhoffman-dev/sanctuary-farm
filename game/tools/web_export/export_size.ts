import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import type { ExportFile } from './fingerprint.ts'

// The Godot web export's transfer size, raw / gzip -9 / brotli 11, per file
// and in total, and the check against the ceilings in budget.ts (SF-100).
// gzip and brotli are the best case: what a server that compresses at the
// maximum level sends.

export interface FileSize {
  name: string
  raw: number
  gzip: number
  brotli: number
}

export interface Ceiling {
  /** What the line measures, as performance-budget.md names it. */
  label: string
  /** Which files count towards it. */
  includes: (fileName: string) => boolean
  /** Brotli bytes over which the check fails. */
  maxBrotliBytes: number
}

export interface CeilingResult {
  label: string
  brotli: number
  maxBrotliBytes: number
  withinCeiling: boolean
}

export const sizeOf = ({ name, bytes }: ExportFile): FileSize => ({
  name,
  raw: bytes.length,
  gzip: gzipSync(bytes, { level: 9 }).length,
  // Window 24 matches the `brotli` CLI's default; zlib's own default (22) reads ~3 % larger.
  brotli: brotliCompressSync(bytes, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 },
  }).length,
})

export const totalOf = (sizes: readonly FileSize[], name = 'total'): FileSize =>
  sizes.reduce((sum, size) => ({ name, raw: sum.raw + size.raw, gzip: sum.gzip + size.gzip, brotli: sum.brotli + size.brotli }), {
    name,
    raw: 0,
    gzip: 0,
    brotli: 0,
  })

export const checkCeilings = (sizes: readonly FileSize[], ceilings: readonly Ceiling[]): CeilingResult[] =>
  ceilings.map(({ label, includes, maxBrotliBytes }) => {
    const brotli = totalOf(sizes.filter((size) => includes(size.name))).brotli
    return { label, brotli, maxBrotliBytes, withinCeiling: brotli <= maxBrotliBytes }
  })

const megabytes = (bytes: number): string => (bytes / 1_000_000).toFixed(2)

export const sizeTable = (sizes: readonly FileSize[]): string =>
  [
    '| File | Raw (MB) | gzip -9 (MB) | brotli 11 (MB) |',
    '| --- | --- | --- | --- |',
    ...[...sizes, totalOf(sizes, '**total**')].map(
      (size) => `| ${size.name} | ${megabytes(size.raw)} | ${megabytes(size.gzip)} | ${megabytes(size.brotli)} |`,
    ),
  ].join('\n')

export const ceilingTable = (results: readonly CeilingResult[]): string =>
  [
    '| Budget line | brotli (MB) | Ceiling (MB) | |',
    '| --- | --- | --- | --- |',
    ...results.map(
      (result) =>
        `| ${result.label} | ${megabytes(result.brotli)} | ${megabytes(result.maxBrotliBytes)} | ${result.withinCeiling ? 'ok' : '**over**'} |`,
    ),
  ].join('\n')
