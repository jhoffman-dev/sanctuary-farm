import { pickUniformIndex, type RandomBytes } from './random.js'

/**
 * Digits 2–9 and the capitals that have no look-alike among them: 0/1 and
 * O, I, L are gone; of 2/Z, 5/S, 8/B only the digit stays, and of U/V only V.
 * 27 symbols a seven-year-old can copy off a fridge note without guessing.
 */
export const SAVE_CODE_ALPHABET = '23456789ACDEFGHJKMNPQRTVWXY'
export const SAVE_CODE_PREFIX = 'FARM'
const GROUP_COUNT = 3
const GROUP_LENGTH = 5
export const SAVE_CODE_SYMBOLS = GROUP_COUNT * GROUP_LENGTH

/** log2(27^15) ≈ 71.3 bits — see docs/sign-in.md for why that is enough. */
export const SAVE_CODE_ENTROPY_BITS = SAVE_CODE_SYMBOLS * Math.log2(SAVE_CODE_ALPHABET.length)

/** A fresh code in its display form, e.g. `FARM-7K4QX-MN3TD-9HWAC`. */
export function generateSaveCode(randomBytes: RandomBytes): string {
  let symbols = ''
  for (let i = 0; i < SAVE_CODE_SYMBOLS; i++) {
    symbols += SAVE_CODE_ALPHABET[pickUniformIndex(randomBytes, SAVE_CODE_ALPHABET.length)]
  }
  return formatSaveCode(symbols)
}

/**
 * Turns whatever a child typed into the canonical display form, or `null` if
 * it cannot be a code. Forgiving about case, spaces, dashes and the `FARM`
 * prefix; strict about length and alphabet, so a typo is refused before any
 * lookup.
 */
export function normalizeSaveCode(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 64) return null
  let symbols = input.toUpperCase().replace(/[\s\-–—_.]/g, '')
  // Only strip the prefix when the length says it is there: a bare code may
  // itself begin with the letters F, A, R, M.
  if (symbols.length === SAVE_CODE_PREFIX.length + SAVE_CODE_SYMBOLS && symbols.startsWith(SAVE_CODE_PREFIX)) {
    symbols = symbols.slice(SAVE_CODE_PREFIX.length)
  }
  if (symbols.length !== SAVE_CODE_SYMBOLS) return null
  for (const symbol of symbols) {
    if (!SAVE_CODE_ALPHABET.includes(symbol)) return null
  }
  return formatSaveCode(symbols)
}

function formatSaveCode(symbols: string): string {
  const groups: string[] = []
  for (let start = 0; start < symbols.length; start += GROUP_LENGTH) {
    groups.push(symbols.slice(start, start + GROUP_LENGTH))
  }
  return [SAVE_CODE_PREFIX, ...groups].join('-')
}
