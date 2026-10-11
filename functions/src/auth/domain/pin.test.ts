import { describe, expect, it } from 'vitest'
import { scriptedBytes, seededBytes } from '../testing/fakes.js'
import { generateAccountId } from './accountId.js'
import { GENERATED_PIN_LENGTH, generatePin, isWellFormedPin } from './pin.js'
import { pickUniformIndex } from './random.js'

describe('generatePin', () => {
  it('is four digits, repeatable from a seed', () => {
    expect(GENERATED_PIN_LENGTH).toBe(4)
    expect(generatePin(seededBytes(1))).toMatch(/^\d{4}$/)
    expect(generatePin(seededBytes(1))).toBe(generatePin(seededBytes(1)))
  })

  it('uses every digit about equally', () => {
    const counts = Array<number>(10).fill(0)
    const bytes = seededBytes(17)
    for (let i = 0; i < 5000; i++) for (const d of generatePin(bytes)) counts[Number(d)]! += 1
    for (const count of counts) expect(Math.abs(count - 2000) / 2000).toBeLessThan(0.1)
  })
})

describe('isWellFormedPin', () => {
  it('accepts 4 to 6 digits only', () => {
    for (const ok of ['0000', '1234', '12345', '123456']) expect(isWellFormedPin(ok)).toBe(true)
    for (const bad of ['123', '1234567', '12a4', ' 1234', '', 1234, null, undefined]) expect(isWellFormedPin(bad)).toBe(false)
  })
})

describe('pickUniformIndex', () => {
  it('rejects bytes at or above the largest multiple of the range', () => {
    // 256 % 10 = 6, so bytes 250..255 are skipped; 251 rejected, 37 → 7.
    expect(pickUniformIndex(scriptedBytes([251, 37, 0, 0, 0, 0, 0, 0]), 10)).toBe(7)
  })

  it('asks for more bytes when a whole batch is rejected', () => {
    expect(pickUniformIndex(scriptedBytes([...Array(8).fill(255), 3, 0, 0, 0, 0, 0, 0, 0]), 10)).toBe(3)
  })

  it('refuses ranges it cannot draw from a byte', () => {
    for (const size of [0, 257, 1.5]) expect(() => pickUniformIndex(seededBytes(1), size)).toThrow(RangeError)
  })
})

describe('generateAccountId', () => {
  it('is sf- plus 128 random bits in hex', () => {
    expect(generateAccountId(seededBytes(2))).toMatch(/^sf-[0-9a-f]{32}$/)
    expect(generateAccountId(seededBytes(2))).not.toBe(generateAccountId(seededBytes(3)))
  })

  it('refuses a random source that comes up short', () => {
    expect(() => generateAccountId(() => new Uint8Array(4))).toThrow(RangeError)
  })
})
