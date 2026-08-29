// Parent dashboard. Read-only view over a SaveData: a 12×12 fluency heatmap, the
// ten slowest facts, per-day volume, and an accuracy trend. Inline SVG only.
import { Fragment, useMemo } from 'react'
import { isHardCore, TIER_NAMES, tierOf } from '@/contracts'
import type { FactState, SaveData } from '@/contracts'

export type DashboardProps = {
  save: SaveData
  onExport: () => void
  onReset: () => void
  onClose: () => void
}

const TABLE = Array.from({ length: 12 }, (_, i) => i + 1)
const DAY_MS = 86_400_000
const DAY_WINDOW = 14

// Box 0 (not introduced) → 5 (mastered). Cool grey up to a settled green.
const BOX_FILL = ['#efece7', '#f6b8a8', '#f8cf9a', '#f3e08b', '#c3e3a1', '#8fd3a6']

function meanLatency(fs: FactState): number | null {
  if (fs.recentLatencies.length > 0) {
    return fs.recentLatencies.reduce((a, b) => a + b, 0) / fs.recentLatencies.length
  }
  return fs.lastLatencyMs
}

function parseId(id: string): [number, number] {
  const [a, b] = id.split('x')
  return [Number(a), Number(b)]
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

type DayStat = {
  key: string
  label: string
  questions: number
  minutes: number
  correct: number
  total: number
}

function buildModel(save: SaveData) {
  const cells = TABLE.flatMap((a) =>
    TABLE.map((b) => {
      const fs = save.facts[`${a}x${b}`] as FactState | undefined
      const introduced = !!fs?.introduced
      return {
        a,
        b,
        box: fs?.box ?? 0,
        lat: fs && introduced ? meanLatency(fs) : null,
      }
    }),
  )

  const slowest = Object.values(save.facts)
    .filter((fs): fs is FactState => !!fs && fs.introduced)
    .map((fs) => ({ fs, lat: meanLatency(fs) }))
    .filter((x): x is { fs: FactState; lat: number } => typeof x.lat === 'number' && Number.isFinite(x.lat))
    .sort((x, y) => y.lat - x.lat)
    .slice(0, 10)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: DayStat[] = []
  const index = new Map<string, DayStat>()
  for (let i = DAY_WINDOW - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS)
    const stat: DayStat = {
      key: dayKey(d.getTime()),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      questions: 0,
      minutes: 0,
      correct: 0,
      total: 0,
    }
    days.push(stat)
    index.set(stat.key, stat)
  }
  for (const s of save.sessions) {
    const stat = index.get(dayKey(s.startedAt))
    if (!stat) continue
    stat.questions += s.entries.length
    stat.minutes += Math.max(0, s.endedAt - s.startedAt) / 60_000
    for (const e of s.entries) {
      stat.total += 1
      if (e.correct) stat.correct += 1
    }
  }

  const maxQuestions = Math.max(1, ...days.map((d) => d.questions))
  const maxMinutes = Math.max(1, ...days.map((d) => d.minutes))
  const totalQ = days.reduce((t, d) => t + d.total, 0)
  const totalCorrect = days.reduce((t, d) => t + d.correct, 0)

  return { cells, slowest, days, maxQuestions, maxMinutes, totalQ, totalCorrect }
}

const CHART_W = 520
const CHART_H = 150
const CHART_PAD = 22

export function Dashboard({ save, onExport, onReset, onClose }: DashboardProps) {
  const model = useMemo(() => buildModel(save), [save])
  const { cells, slowest, days, maxQuestions, maxMinutes, totalQ, totalCorrect } = model

  const band = (CHART_W - CHART_PAD * 2) / days.length
  const plotH = CHART_H - CHART_PAD * 2
  const baseline = CHART_H - CHART_PAD

  const accuracyPoints = days.map((d, i) => ({
    x: CHART_PAD + i * band + band / 2,
    y: d.total > 0 ? baseline - (d.correct / d.total) * plotH : null,
  }))
  const accuracyPath = accuracyPoints
    .filter((p): p is { x: number; y: number } => p.y != null)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  const overallAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : null

  return (
    <div className="max-w-3xl space-y-6 text-sm text-stone-800">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Parent dashboard</h2>
          <p className="text-stone-500">
            {save.globalCounter} questions answered · {save.sessions.length} sessions
            {overallAccuracy != null ? ` · ${overallAccuracy}% accurate (14d)` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-stone-200 px-3 py-1.5 hover:bg-stone-300"
            onClick={onExport}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="rounded bg-rose-200 px-3 py-1.5 hover:bg-rose-300"
            onClick={() => {
              if (window.confirm('Reset all progress? This wipes every creature and fact. This cannot be undone.')) {
                onReset()
              }
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded bg-stone-200 px-3 py-1.5 hover:bg-stone-300"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </header>

      <section className="space-y-2">
        <h3 className="font-semibold">Fluency heatmap — box level &amp; mean latency</h3>
        <div
          className="grid gap-[2px] text-[10px] leading-none"
          style={{ gridTemplateColumns: 'auto repeat(12, minmax(0, 1fr))' }}
        >
          <div />
          {TABLE.map((b) => (
            <div key={b} className="pb-0.5 text-center font-medium text-stone-500">
              {b}
            </div>
          ))}
          {TABLE.map((a) => (
            <Fragment key={a}>
              <div className="pr-1 text-right font-medium text-stone-500">{a}</div>
              {TABLE.map((b) => {
                const cell = cells[(a - 1) * 12 + (b - 1)]
                const seconds = cell.lat != null ? cell.lat / 1000 : null
                return (
                  <div
                    key={b}
                    title={`${a}×${b} — box ${cell.box}${seconds != null ? ` — ${seconds.toFixed(1)}s` : ' — not introduced'}`}
                    className="flex aspect-square items-center justify-center rounded-[3px] text-stone-700"
                    style={{ backgroundColor: BOX_FILL[cell.box] }}
                  >
                    {seconds != null ? seconds.toFixed(1) : ''}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
          {BOX_FILL.map((fill, box) => (
            <span key={box} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: fill }}
              />
              {box === 0 ? 'new' : `box ${box}`}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Ten slowest facts right now</h3>
        {slowest.length === 0 ? (
          <p className="text-stone-500">No introduced facts with timing data yet.</p>
        ) : (
          <ol className="space-y-1">
            {slowest.map(({ fs, lat }) => {
              const [a, b] = parseId(fs.id)
              return (
                <li key={fs.id} className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    {a} × {b}
                    {isHardCore(fs.id) ? (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        hard core
                      </span>
                    ) : null}
                  </span>
                  <span className="text-stone-500">
                    {(lat / 1000).toFixed(1)}s · box {fs.box} · {TIER_NAMES[tierOf(a, b)]}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Questions &amp; minutes per day (last 14 days)</h3>
        <div className="flex gap-4 text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#6366f1' }} />
            questions
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
            minutes
          </span>
        </div>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full"
          role="img"
          aria-label="Questions and minutes practised per day"
        >
          <line
            x1={CHART_PAD}
            y1={baseline}
            x2={CHART_W - CHART_PAD}
            y2={baseline}
            stroke="#d6d3d1"
          />
          {days.map((d, i) => {
            const x = CHART_PAD + i * band
            const qh = (d.questions / maxQuestions) * plotH
            const mh = (d.minutes / maxMinutes) * plotH
            return (
              <g key={d.key}>
                <rect
                  x={x + band * 0.16}
                  y={baseline - qh}
                  width={band * 0.32}
                  height={qh}
                  fill="#6366f1"
                />
                <rect
                  x={x + band * 0.52}
                  y={baseline - mh}
                  width={band * 0.32}
                  height={mh}
                  fill="#f59e0b"
                />
                {i % 2 === 0 ? (
                  <text
                    x={x + band / 2}
                    y={CHART_H - 6}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#78716c"
                  >
                    {d.label}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Accuracy trend (last 14 days)</h3>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full"
          role="img"
          aria-label="Accuracy per day"
        >
          {[0, 0.5, 1].map((frac) => {
            const y = baseline - frac * plotH
            return (
              <g key={frac}>
                <line x1={CHART_PAD} y1={y} x2={CHART_W - CHART_PAD} y2={y} stroke="#e7e5e4" />
                <text x={2} y={y + 3} fontSize="8" fill="#78716c">
                  {Math.round(frac * 100)}%
                </text>
              </g>
            )
          })}
          {accuracyPath ? (
            <path d={accuracyPath} fill="none" stroke="#0ea5e9" strokeWidth={2} />
          ) : null}
          {accuracyPoints.map((p, i) =>
            p.y != null ? (
              <circle key={days[i].key} cx={p.x} cy={p.y} r={2.5} fill="#0ea5e9" />
            ) : null,
          )}
          {days.map((d, i) =>
            i % 2 === 0 ? (
              <text
                key={d.key}
                x={CHART_PAD + i * band + band / 2}
                y={CHART_H - 6}
                textAnchor="middle"
                fontSize="8"
                fill="#78716c"
              >
                {d.label}
              </text>
            ) : null,
          )}
        </svg>
      </section>
    </div>
  )
}
