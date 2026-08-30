// The training ring — no quiz, no score. A place to *see* how a tricky fact
// breaks down, using common-core strategies (the distributive property / area
// model, anchoring on ×10, doubling, and near-squares).
import { useMemo, useState } from 'react'
import { creatureParamsFor } from '../creatureFor'
import { CreatureSVG } from '@/creatures/CreatureSVG'
import { useGame } from '../gameState'

const PRACTICE_FACTS: [number, number][] = [
  [6, 7], [7, 8], [6, 8], [7, 9], [8, 9], [8, 8], [7, 7], [4, 8], [6, 6], [9, 12],
]

type Strategy = {
  key: string
  title: string
  say: string
  steps: string[]
}

function strategiesFor(a: number, b: number): Strategy[] {
  const out: Strategy[] = []

  // 1. Break apart the array (distributive property)
  const split = b >= 6 ? [5, b - 5] : [Math.floor(b / 2), Math.ceil(b / 2)]
  out.push({
    key: 'array',
    title: 'Break the array apart',
    say: `Split ${b} into ${split[0]} and ${split[1]}. Do each part, then add.`,
    steps: [
      `${a} × ${split[0]} = ${a * split[0]}`,
      `${a} × ${split[1]} = ${a * split[1]}`,
      `${a * split[0]} + ${a * split[1]} = ${a * b}`,
    ],
  })

  // 2. Anchor on ×10
  if (b >= 6 && b <= 12 && b !== 10) {
    const diff = 10 - b
    out.push({
      key: 'ten',
      title: b < 10 ? 'Start from ×10, then take some away' : 'Start from ×10, then add some',
      say:
        b < 10
          ? `${a} × 10 is easy. ${b} is ${diff} less than 10, so take away ${a} × ${diff}.`
          : `${a} × 10 is easy. ${b} is ${b - 10} more than 10, so add ${a} × ${b - 10}.`,
      steps:
        b < 10
          ? [`${a} × 10 = ${a * 10}`, `${a} × ${diff} = ${a * diff}`, `${a * 10} − ${a * diff} = ${a * b}`]
          : [`${a} × 10 = ${a * 10}`, `${a} × ${b - 10} = ${a * (b - 10)}`, `${a * 10} + ${a * (b - 10)} = ${a * b}`],
    })
  }

  // 3. Doubling
  if (b % 2 === 0) {
    out.push({
      key: 'double',
      title: 'Halve and double',
      say: `Do ${a} × ${b / 2} first, then double it.`,
      steps: [`${a} × ${b / 2} = ${a * (b / 2)}`, `double ${a * (b / 2)} → ${a * b}`],
    })
  }

  // 4. Near square
  if (a !== b) {
    const d = b - a
    out.push({
      key: 'square',
      title: 'Use a square you know',
      say: `${a} × ${a} = ${a * a}. ${b} is ${Math.abs(d)} ${d > 0 ? 'more' : 'less'} than ${a}, so ${d > 0 ? 'add' : 'subtract'} ${a} × ${Math.abs(d)}.`,
      steps: [
        `${a} × ${a} = ${a * a}`,
        `${a} × ${Math.abs(d)} = ${a * Math.abs(d)}`,
        `${a * a} ${d > 0 ? '+' : '−'} ${a * Math.abs(d)} = ${a * b}`,
      ],
    })
  }

  return out
}

function ArrayModel({ a, b }: { a: number; b: number }) {
  const cell = 16
  const splitAt = b >= 6 ? 5 : Math.floor(b / 2)
  return (
    <svg width={b * cell + 4} height={a * cell + 4} className="mx-auto">
      {Array.from({ length: a }).map((_, r) =>
        Array.from({ length: b }).map((_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={c * cell + cell / 2 + 2}
            cy={r * cell + cell / 2 + 2}
            r={cell * 0.32}
            fill={c < splitAt ? '#66bb6a' : '#42a5f5'}
          />
        )),
      )}
      <line
        x1={splitAt * cell + 2}
        y1={0}
        x2={splitAt * cell + 2}
        y2={a * cell + 4}
        stroke="#5d4037"
        strokeWidth={2}
        strokeDasharray="3 3"
      />
    </svg>
  )
}

export function TrainingScreen() {
  const { back, creatures } = useGame()
  const [fact, setFact] = useState<[number, number]>([7, 8])
  const [i, setI] = useState(0)
  const trainee = creatures[0]?.family ?? 10

  const strategies = useMemo(() => strategiesFor(fact[0], fact[1]), [fact])
  const s = strategies[i % strategies.length]
  const [a, b] = fact

  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-3 p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Farmyard
        </button>
        <h1 className="font-semibold">The training ring</h1>
      </header>

      <div className="mx-auto max-w-md space-y-4 p-4">
        <p className="text-center text-sm text-stone-500">Pick a tricky one and see how to break it down.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {PRACTICE_FACTS.map(([x, y]) => (
            <button
              key={`${x}x${y}`}
              type="button"
              onClick={() => {
                setFact([x, y])
                setI(0)
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                x === a && y === b ? 'bg-stone-900 text-white' : 'bg-stone-200'
              }`}
            >
              {x} × {y}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-4 text-center shadow">
          <p className="text-3xl font-bold">
            {a} × {b} = {a * b}
          </p>
          <div className="my-3 flex items-end justify-center gap-3">
            <ArrayModel a={a} b={b} />
            <CreatureSVG params={creatureParamsFor(trainee)} mood="content" size={56} />
          </div>
          <p className="text-sm font-semibold text-emerald-700">{s.title}</p>
          <p className="mt-1 text-sm text-stone-600">{s.say}</p>
          <div className="mt-3 space-y-1">
            {s.steps.map((step, k) => (
              <p key={k} className="rounded bg-stone-50 py-1 font-mono text-sm">
                {step}
              </p>
            ))}
          </div>
          {strategies.length > 1 ? (
            <button
              type="button"
              onClick={() => setI((n) => n + 1)}
              className="mt-3 rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-amber-900"
            >
              Show me another way
            </button>
          ) : null}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={back}
            className="rounded-lg bg-stone-900 px-6 py-2 text-white"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
