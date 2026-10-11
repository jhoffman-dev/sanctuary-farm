import { describe, expect, it } from 'vitest'
import { scriptedBytes, seededBytes } from '../testing/fakes.js'
import {
  SAVE_CODE_ALPHABET,
  SAVE_CODE_ENTROPY_BITS,
  SAVE_CODE_SYMBOLS,
  generateSaveCode,
  normalizeSaveCode,
} from './saveCode.js'

const SHAPE = /^FARM-[2-9A-Z]{5}-[2-9A-Z]{5}-[2-9A-Z]{5}$/

describe('save code alphabet', () => {
  it('has 27 distinct symbols and none that a child could misread', () => {
    expect(new Set(SAVE_CODE_ALPHABET).size).toBe(27)
    for (const lookalike of '01OILSZBU') expect(SAVE_CODE_ALPHABET).not.toContain(lookalike)
  })

  it('carries more than the 60 bits the threat model asks for', () => {
    expect(SAVE_CODE_SYMBOLS).toBe(15)
    expect(SAVE_CODE_ENTROPY_BITS).toBeGreaterThan(71)
    expect(SAVE_CODE_ENTROPY_BITS).toBeLessThan(72)
  })
})

describe('generateSaveCode', () => {
  it('reads as FARM plus three groups of five', () => {
    const code = generateSaveCode(seededBytes(1))
    expect(code).toMatch(SHAPE)
    for (const symbol of code.slice(5).replaceAll('-', '')) expect(SAVE_CODE_ALPHABET).toContain(symbol)
  })

  it('is repeatable from a seed and differs between seeds', () => {
    expect(generateSaveCode(seededBytes(7))).toBe(generateSaveCode(seededBytes(7)))
    expect(generateSaveCode(seededBytes(7))).not.toBe(generateSaveCode(seededBytes(8)))
  })

  it('spreads symbols evenly (no modulo bias)', () => {
    const counts = new Map<string, number>()
    const bytes = seededBytes(99)
    for (let i = 0; i < 2000; i++) {
      for (const symbol of generateSaveCode(bytes).slice(5).replaceAll('-', '')) {
        counts.set(symbol, (counts.get(symbol) ?? 0) + 1)
      }
    }
    const expected = (2000 * 15) / 27
    expect(counts.size).toBe(27)
    for (const count of counts.values()) expect(Math.abs(count - expected) / expected).toBeLessThan(0.1)
  })

  it('skips bytes that would bias the draw', () => {
    // 243 = 27 × 9 is the first rejected byte; 0 maps to '2', 28 to '3'.
    const bytes = scriptedBytes([243, 255, 0, 0, 0, 0, 0, 0, ...Array(8 * 14).fill(28)])
    expect(generateSaveCode(bytes)).toBe('FARM-23333-33333-33333')
  })
})

describe('normalizeSaveCode', () => {
  it('accepts what a child might type: lower case, spaces, missing dashes or prefix', () => {
    const canonical = 'FARM-7K4QX-MN3TD-9HWAC'
    for (const typed of [canonical, 'farm-7k4qx-mn3td-9hwac', ' 7K4QX MN3TD 9HWAC ', 'FARM7K4QXMN3TD9HWAC', '7k4qx—mn3td–9hwac']) {
      expect(normalizeSaveCode(typed)).toBe(canonical)
    }
  })

  it('keeps a bare code that itself starts with F, A, R, M', () => {
    expect(normalizeSaveCode('FARM7-K4QXM-N3TD9')).toBe('FARM-FARM7-K4QXM-N3TD9')
  })

  it('refuses wrong length, look-alike symbols and non-strings', () => {
    for (const bad of ['', 'FARM-7K4QX-MN3TD', 'FARM-7K4QX-MN3TD-9HWAC2', 'FARM-0K4QX-MN3TD-9HWAC', 'FARM-7K4QX-MN3TD-9HWAL', 'x'.repeat(65), 42, null, undefined, {}]) {
      expect(normalizeSaveCode(bad)).toBeNull()
    }
  })
})
