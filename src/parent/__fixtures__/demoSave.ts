// Deterministic demo SaveData for the dashboard dev route and tests: varied fact
// boxes/latencies and ~14 days of session history.
import {
  createRng,
  factId,
  FLUENT_MAX_MS,
  isHardCore,
  LABORED_MIN_MS,
  tierOf,
} from '@/contracts'
import type { Box, Outcome, SaveData, SessionEntry, SessionLog } from '@/contracts'
import { emptySave } from '@/save/store'

const DAY_MS = 86_400_000

function outcomeFor(correct: boolean, latencyMs: number): Outcome {
  if (!correct) return 'WRONG'
  if (latencyMs < FLUENT_MAX_MS) return 'FLUENT'
  if (latencyMs <= LABORED_MIN_MS) return 'SLOW'
  return 'LABORED'
}

/** @param now epoch ms the 14-day window ends on (defaults to Date.now()). */
export function buildDemoSave(now: number = Date.now()): SaveData {
  const save = emptySave()
  const rng = createRng(20260829)

  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      const id = factId(a, b)
      const fs = save.facts[id]
      if (!fs) continue
      const introduced = tierOf(a, b) <= 4 || rng() < 0.35
      if (!introduced) continue

      const box = (1 + Math.floor(rng() * 5)) as Box
      const floor = 850 + (5 - box) * 420 + (isHardCore(id) ? 700 : 0)
      const sample = () => Math.round(floor + rng() * 1100)
      const recent = Array.from({ length: 3 + Math.floor(rng() * 3) }, sample)

      fs.introduced = true
      fs.box = box
      fs.recentLatencies = recent
      fs.lastLatencyMs = recent[recent.length - 1]
      fs.totalAttempts = recent.length + Math.floor(rng() * 6)
      fs.totalCorrect = Math.max(0, fs.totalAttempts - Math.floor(rng() * 3))
      fs.correctStreak = Math.floor(rng() * 4)
      fs.dueAt = Math.floor(rng() * 220)
    }
  }

  const sessions: SessionLog[] = []
  for (let d = 13; d >= 0; d--) {
    if (d % 6 === 4) continue // a couple of gap days
    const dayStart = now - d * DAY_MS
    const sessionCount = 1 + Math.floor(rng() * 2)
    for (let s = 0; s < sessionCount; s++) {
      const startedAt = dayStart + s * 3_600_000 + Math.floor(rng() * 900_000)
      const n = 4 + Math.floor(rng() * 4)
      const entries: SessionEntry[] = []
      for (let i = 0; i < n; i++) {
        const a = 1 + Math.floor(rng() * 12)
        const b = 1 + Math.floor(rng() * 12)
        const latencyMs = Math.round(800 + rng() * 6500)
        const correct = rng() > 0.14
        entries.push({
          factId: factId(a, b),
          given: correct ? a * b : a * b + 1,
          correct,
          latencyMs,
          outcome: outcomeFor(correct, latencyMs),
          askedAt: save.globalCounter + i,
        })
      }
      const endedAt = startedAt + entries.reduce((t, e) => t + e.latencyMs, 0) + 2000
      sessions.push({
        startedAt,
        endedAt,
        context: s === 0 ? 'stall' : 'free',
        familyContext: s === 0 ? 1 + Math.floor(rng() * 12) : null,
        entries,
      })
      save.globalCounter += entries.length
    }
  }

  save.sessions = sessions
  return save
}
