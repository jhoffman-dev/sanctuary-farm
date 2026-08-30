/** Local calendar date as YYYY-MM-DD (matches SaveData.lastChoresDate). */
export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Whole calendar days from `a` to `b` (YYYY-MM-DD). Negative if b is before a. */
export function daysBetween(a: string, b: string): number {
  const pa = Date.parse(`${a}T00:00:00`)
  const pb = Date.parse(`${b}T00:00:00`)
  if (Number.isNaN(pa) || Number.isNaN(pb)) return 0
  return Math.round((pb - pa) / 86_400_000)
}
