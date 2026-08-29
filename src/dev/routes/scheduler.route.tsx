// TRACK A owns this file. A simulation harness: run N synthetic answers through a
// fresh scheduler with a configurable accuracy target + latency profile, then
// print the resulting box histogram and every family's familyProgress.
import { useMemo, useState } from 'react'
import type { DevRoute } from './_registry'
import { ALL_FAMILIES, createRng } from '@/contracts'
import { createScheduler, initialSchedulerState } from '@/engine/scheduler'

const RUN_SIZE = 500

type Profile = {
  seed: number
  accuracyPct: number
  fluentMs: number
  slowMs: number
  laboredMs: number
  /** Of the CORRECT answers, the share that lands in the slow / labored band. */
  slowSharePct: number
  laboredSharePct: number
}

const DEFAULTS: Profile = {
  seed: 1,
  accuracyPct: 85,
  fluentMs: 1800,
  slowMs: 5000,
  laboredMs: 9500,
  slowSharePct: 25,
  laboredSharePct: 8,
}

type RunResult = {
  boxes: number[] // index 0..5
  attempts: number
  correct: number
  outcomes: Record<string, number>
  families: { family: number; progress: number; mastered: boolean }[]
  masteredFamilies: number
}

function simulate(p: Profile): RunResult {
  const rng = createRng(p.seed)
  const state = initialSchedulerState()
  const scheduler = createScheduler(state, { rng: createRng(p.seed ^ 0x9e3779b9) })

  const outcomes: Record<string, number> = { FLUENT: 0, SLOW: 0, LABORED: 0, WRONG: 0 }
  let correct = 0

  for (let i = 0; i < RUN_SIZE; i++) {
    const fact = scheduler.next()
    const roll = rng()
    const isCorrect = roll * 100 < p.accuracyPct
    let given = fact.answer
    let latency = p.fluentMs
    if (!isCorrect) {
      given = fact.answer + 1 // deterministic wrong answer
      latency = p.fluentMs
    } else {
      const band = rng() * 100
      if (band < p.laboredSharePct) latency = p.laboredMs
      else if (band < p.laboredSharePct + p.slowSharePct) latency = p.slowMs
      else latency = p.fluentMs
    }
    const res = scheduler.grade(fact.id, given, latency)
    outcomes[res.outcome] += 1
    if (res.correct) correct += 1
  }

  const snap = scheduler.snapshot()
  const boxes = [0, 0, 0, 0, 0, 0]
  for (const fs of Object.values(snap.facts)) boxes[fs.box] += 1

  const families = ALL_FAMILIES.map((family) => ({
    family,
    progress: scheduler.familyProgress(family),
    mastered: scheduler.isMastered(family),
  }))

  return {
    boxes,
    attempts: RUN_SIZE,
    correct,
    outcomes,
    families,
    masteredFamilies: families.filter((f) => f.mastered).length,
  }
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-stone-600">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 rounded border border-stone-300 px-2 py-1"
      />
    </label>
  )
}

function SchedulerDevRoute() {
  const [profile, setProfile] = useState<Profile>(DEFAULTS)
  const [runToken, setRunToken] = useState(0)

  const result = useMemo<RunResult>(() => {
    void runToken
    return simulate(profile)
  }, [profile, runToken])

  const maxBox = Math.max(...result.boxes, 1)
  const set = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Scheduler simulation</h1>
        <p className="text-sm text-stone-600">
          {RUN_SIZE} synthetic answers through a fresh scheduler (cold start: families
          1, 2, 10). Latency is the primary promotion signal.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <NumField label="RNG seed" value={profile.seed} onChange={(n) => set({ seed: n })} />
        <NumField
          label="Target accuracy (%)"
          value={profile.accuracyPct}
          onChange={(n) => set({ accuracyPct: n })}
        />
        <NumField
          label="Fluent latency (ms)"
          value={profile.fluentMs}
          onChange={(n) => set({ fluentMs: n })}
        />
        <NumField
          label="Slow latency (ms)"
          value={profile.slowMs}
          onChange={(n) => set({ slowMs: n })}
        />
        <NumField
          label="Labored latency (ms)"
          value={profile.laboredMs}
          onChange={(n) => set({ laboredMs: n })}
        />
        <NumField
          label="Slow share of correct (%)"
          value={profile.slowSharePct}
          onChange={(n) => set({ slowSharePct: n })}
        />
        <NumField
          label="Labored share of correct (%)"
          value={profile.laboredSharePct}
          onChange={(n) => set({ laboredSharePct: n })}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setRunToken((t) => t + 1)}
          className="rounded bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Re-run
        </button>
        <button
          type="button"
          onClick={() => setProfile(DEFAULTS)}
          className="rounded border border-stone-300 px-4 py-2 text-sm"
        >
          Reset
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Outcomes
        </h2>
        <p className="text-sm text-stone-700">
          {result.correct}/{result.attempts} correct (
          {((result.correct / result.attempts) * 100).toFixed(1)}%) — FLUENT{' '}
          {result.outcomes.FLUENT}, SLOW {result.outcomes.SLOW}, LABORED{' '}
          {result.outcomes.LABORED}, WRONG {result.outcomes.WRONG}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Box histogram (0 = not introduced)
        </h2>
        <table className="text-sm">
          <tbody>
            {result.boxes.map((count, box) => (
              <tr key={box}>
                <td className="pr-3 font-mono">box {box}</td>
                <td className="pr-3">
                  <span
                    className="inline-block h-3 bg-emerald-500"
                    style={{ width: `${(count / maxBox) * 240}px` }}
                  />
                </td>
                <td className="font-mono tabular-nums">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Family progress ({result.masteredFamilies} mastered)
        </h2>
        <table className="text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="pr-4">Family</th>
              <th className="pr-4">familyProgress</th>
              <th>isMastered</th>
            </tr>
          </thead>
          <tbody>
            {result.families.map((f) => (
              <tr key={f.family}>
                <td className="pr-4 font-mono">×{f.family}</td>
                <td className="pr-4 font-mono tabular-nums">{f.progress.toFixed(3)}</td>
                <td>{f.mastered ? 'yes' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default {
  path: '#/dev/scheduler',
  label: 'Scheduler sim',
  order: 10,
  Component: SchedulerDevRoute,
} satisfies DevRoute
