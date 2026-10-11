import { pickUniformIndex, type RandomBytes } from './random.js'

/**
 * PINs are generated, not chosen: a child-chosen four-digit PIN is very often
 * a birthday or birth year — personal data we promised never to collect — or
 * `1234`, the first thing a classmate tries.
 */
export const GENERATED_PIN_LENGTH = 4

export function generatePin(randomBytes: RandomBytes): string {
  let pin = ''
  for (let i = 0; i < GENERATED_PIN_LENGTH; i++) pin += String(pickUniformIndex(randomBytes, 10))
  return pin
}

/**
 * 4–6 digits are accepted at sign-in so the generated length can grow later
 * without locking out the farms that already hold a four-digit PIN.
 */
export function isWellFormedPin(input: unknown): input is string {
  return typeof input === 'string' && /^\d{4,6}$/.test(input)
}
