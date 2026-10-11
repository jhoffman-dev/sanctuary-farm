import { describe, expect, it } from 'vitest'
import { seededBytes } from '../testing/fakes.js'
import { ADJECTIVES, ANIMALS, USERNAME_NUMBERS } from './kidSafeWords.js'
import { USERNAME_COMBINATIONS, generateUsername, usernameKey } from './username.js'

/**
 * Substrings no generated name may contain, anywhere — including across the
 * join between two words ("…ass" + "…") and into the digits. Deliberately
 * broad: a false alarm costs a word swap, a miss reaches a child.
 */
const BLOCKLIST = [
  'anal', 'anus', 'arse', 'ass', 'bitch', 'boob', 'butt', 'clit', 'cock', 'coon', 'crap', 'cum', 'cunt',
  'damn', 'dick', 'dildo', 'dyke', 'fag', 'fuck', 'gay', 'god', 'hell', 'homo', 'jew', 'jizz', 'kike',
  'kill', 'kkk', 'nazi', 'nig', 'nude', 'paki', 'penis', 'piss', 'poop', 'porn', 'pube', 'puss', 'rape',
  'retard', 'sex', 'shit', 'slut', 'spic', 'suck', 'tit', 'twat', 'vagina', 'wank', 'whore', 'dead',
  'die', 'gun', 'hate', 'drug', 'weed', 'beer', 'drunk', 'stupid', 'dumb', 'fat', 'ugly', 'loser', 'idiot',
  '14', '18', '69', '88',
]

describe('kid-safe word lists', () => {
  it('has 64 distinct, capitalised, alphabetic words of each kind, at most 8 letters', () => {
    for (const list of [ADJECTIVES, ANIMALS]) {
      expect(list).toHaveLength(64)
      expect(new Set(list).size).toBe(64)
      for (const word of list) expect(word).toMatch(/^[A-Z][a-z]{2,7}$/)
    }
  })

  it('offers 86 two-digit suffixes', () => {
    expect(USERNAME_NUMBERS).toHaveLength(86)
    for (const n of USERNAME_NUMBERS) expect(n).toBeGreaterThanOrEqual(10)
    expect(USERNAME_COMBINATIONS).toBe(64 * 64 * 86)
  })

  it('never spells a blocked word or number in any of the 352,256 names', () => {
    const offending: string[] = []
    for (const adjective of ADJECTIVES) {
      for (const animal of ANIMALS) {
        for (const n of USERNAME_NUMBERS) {
          // Checked whole, so a word formed across a join ("…as" + "S…") is caught too.
          const name = `${adjective}${animal}${n}`.toLowerCase()
          for (const blocked of BLOCKLIST) if (name.includes(blocked)) offending.push(`${name} ⊃ ${blocked}`)
        }
      }
    }
    expect(offending).toEqual([])
  })
})

describe('generateUsername', () => {
  it('is an adjective, an animal and two digits from the lists', () => {
    const bytes = seededBytes(3)
    for (let i = 0; i < 200; i++) {
      const name = generateUsername(bytes)
      const match = /^([A-Z][a-z]+)([A-Z][a-z]+)(\d{2})$/.exec(name)
      expect(match, name).not.toBeNull()
      const [, adjective, animal, digits] = match as RegExpExecArray
      expect(ADJECTIVES).toContain(adjective)
      expect(ANIMALS).toContain(animal)
      expect(USERNAME_NUMBERS).toContain(Number(digits))
    }
  })

  it('is repeatable from a seed', () => {
    expect(generateUsername(seededBytes(5))).toBe(generateUsername(seededBytes(5)))
  })

  it('always produces a name its own key function accepts', () => {
    const bytes = seededBytes(11)
    for (let i = 0; i < 500; i++) expect(usernameKey(generateUsername(bytes))).not.toBeNull()
  })
})

describe('usernameKey', () => {
  it('folds case and spaces so BraveOtter42 and "brave otter 42" are the same farm', () => {
    expect(usernameKey('BraveOtter42')).toBe('braveotter42')
    expect(usernameKey(' brave otter 42 ')).toBe('braveotter42')
  })

  it('refuses anything that cannot be a generated name', () => {
    for (const bad of ['', 'BraveOtter', 'BraveOtter4', 'BraveOtter423', 'Brave-Otter42', 'Bob42', 'ab'.repeat(21) + '42', 42, null, { name: 'x' }]) {
      expect(usernameKey(bad)).toBeNull()
    }
  })
})
