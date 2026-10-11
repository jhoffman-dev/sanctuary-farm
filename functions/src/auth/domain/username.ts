import { ADJECTIVES, ANIMALS, USERNAME_NUMBERS } from './kidSafeWords.js'
import { pickUniformIndex, type RandomBytes } from './random.js'

/** Adjective + animal + two digits, e.g. `BraveOtter42`. Never typed by a child. */
export function generateUsername(randomBytes: RandomBytes): string {
  const adjective = ADJECTIVES[pickUniformIndex(randomBytes, ADJECTIVES.length)]
  const animal = ANIMALS[pickUniformIndex(randomBytes, ANIMALS.length)]
  const suffix = USERNAME_NUMBERS[pickUniformIndex(randomBytes, USERNAME_NUMBERS.length)]
  return `${adjective}${animal}${suffix}`
}

/** 64 × 64 × 86 = 352,256 names: enough to rarely collide, not a secret. */
export const USERNAME_COMBINATIONS = ADJECTIVES.length * ANIMALS.length * USERNAME_NUMBERS.length

const USERNAME_SHAPE = /^[a-z]{5,20}\d{2}$/

/**
 * The lookup key for a typed username: lower case, spaces dropped, or `null`
 * if it cannot be one of ours. Sign-in is case-insensitive because a child
 * reads `BraveOtter42` and may type `braveotter42`.
 */
export function usernameKey(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 40) return null
  const key = input.toLowerCase().replace(/\s/g, '')
  return USERNAME_SHAPE.test(key) ? key : null
}
