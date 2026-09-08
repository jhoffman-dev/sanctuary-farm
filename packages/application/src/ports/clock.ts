/** Wall-clock time. The only way application or domain code learns what time it is. */
export interface Clock {
  /** Epoch milliseconds. */
  now(): number
}
