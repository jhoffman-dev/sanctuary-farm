import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { type FileSize, ceilingTable, checkCeilings, sizeOf, sizeTable, totalOf } from './export_size.ts'

// Deterministic incompressible bytes: a SHA-256 chain, the same on every run.
const noise = (length: number): Uint8Array => {
  const out = new Uint8Array(length)
  let block = createHash('sha256').update('seed').digest()
  for (let at = 0; at < length; at += block.length) {
    out.set(block.subarray(0, Math.min(block.length, length - at)), at)
    block = createHash('sha256').update(block).digest()
  }
  return out
}

const size = (name: string, brotli: number): FileSize => ({ name, raw: brotli * 4, gzip: brotli * 2, brotli })

describe('sizeOf', () => {
  it('compresses repetitive bytes far below their raw size, brotli at most as large as gzip', () => {
    const measured = sizeOf({ name: 'index.wasm', bytes: new Uint8Array(100_000).fill(7) })

    expect(measured.raw).toBe(100_000)
    expect(measured.gzip).toBeLessThan(1_000)
    expect(measured.brotli).toBeLessThanOrEqual(measured.gzip)
  })

  it('cannot shrink incompressible bytes, which is why an already-compressed pack gains little', () => {
    const measured = sizeOf({ name: 'index.pck', bytes: noise(50_000) })

    expect(measured.brotli).toBeGreaterThanOrEqual(50_000)
  })
})

describe('checkCeilings', () => {
  const sizes = [size('engine-abc.wasm', 3_000_000), size('engine-abc.js', 60_000), size('game-def.pck', 500_000)]
  const engineOnly = (name: string): boolean => name.startsWith('engine-')

  it('sums only the files a line includes', () => {
    const [result] = checkCeilings(sizes, [{ label: 'engine', includes: engineOnly, maxBrotliBytes: 4_000_000 }])

    expect(result).toEqual({ label: 'engine', brotli: 3_060_000, maxBrotliBytes: 4_000_000, withinCeiling: true })
  })

  it('passes exactly at the ceiling and fails one byte over it', () => {
    const at = checkCeilings(sizes, [{ label: 'all', includes: () => true, maxBrotliBytes: 3_560_000 }])
    const over = checkCeilings(sizes, [{ label: 'all', includes: () => true, maxBrotliBytes: 3_559_999 }])

    expect(at[0].withinCeiling).toBe(true)
    expect(over[0].withinCeiling).toBe(false)
  })
})

describe('tables', () => {
  it('lists every file and a total in megabytes', () => {
    const table = sizeTable([size('a.wasm', 1_000_000), size('b.pck', 500_000)])

    expect(table).toContain('| a.wasm | 4.00 | 2.00 | 1.00 |')
    expect(table).toContain('| **total** | 6.00 | 3.00 | 1.50 |')
    expect(totalOf([size('a', 1), size('b', 2)]).brotli).toBe(3)
  })

  it('marks a line over its ceiling', () => {
    const table = ceilingTable([
      { label: 'engine', brotli: 5_000_000, maxBrotliBytes: 4_000_000, withinCeiling: false },
      { label: 'pack', brotli: 1_000_000, maxBrotliBytes: 2_000_000, withinCeiling: true },
    ])

    expect(table).toContain('| engine | 5.00 | 4.00 | **over** |')
    expect(table).toContain('| pack | 1.00 | 2.00 | ok |')
  })
})
