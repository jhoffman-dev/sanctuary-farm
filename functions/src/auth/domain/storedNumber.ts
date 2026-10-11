/** True for a whole, non-negative number — the only shape a stored counter or time may take. */
export function isStoredCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
