// Chibi baby-animal renderer. Big round head, tiny body, soft-vector storybook
// look. The `animal` field picks ears / snout / tail; `palette` tints it; `mood`
// drives eyes and mouth. Square 0 0 100 100 viewBox, scales to `size`.
import type { ReactNode } from 'react'
import type { AnimalKind, CreatureMood, CreatureSVGProps } from '@/contracts'

type P = [string, string, string] // body, belly, ink

const HEAD = { cx: 50, cy: 43, r: 27 }
const BODY = { cx: 50, cy: 76, rx: 19, ry: 15 }

function Eyes({ mood, style, ink }: { mood: CreatureMood; style: string; ink: string }) {
  const y = HEAD.cy + 2
  const dx = 10
  if (mood === 'sleeping') {
    return (
      <g data-part="eyes" data-eyes="closed" stroke={ink} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <path d={`M${50 - dx - 4} ${y} q4 4 8 0`} />
        <path d={`M${50 + dx - 4} ${y} q4 4 8 0`} />
      </g>
    )
  }
  if (mood === 'happy') {
    return (
      <g data-part="eyes" data-eyes="arc" stroke={ink} strokeWidth={2.6} strokeLinecap="round" fill="none">
        <path d={`M${50 - dx - 4} ${y + 1} q4 -5 8 0`} />
        <path d={`M${50 + dx - 4} ${y + 1} q4 -5 8 0`} />
      </g>
    )
  }
  const rBase = style === 'sleepy' ? 3 : style === 'wide' ? 5 : 4.2
  const squint = mood === 'puzzled'
  return (
    <g data-part="eyes" data-eyes={squint ? `squint-${style}` : style}>
      {squint ? <path data-part="eyebrow" d={`M${50 - dx - 5} ${y - 8} q5 -3 10 0`} stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" /> : null}
      {[-dx, dx].map((ox, i) => (
        <g key={i} transform={`translate(${50 + ox} ${y}) ${squint && i === 0 ? 'scale(1 0.55)' : ''}`}>
          <ellipse rx={rBase} ry={style === 'sleepy' ? rBase * 0.7 : rBase} fill={ink} />
          {style === 'sparkly' || style === 'big' ? (
            <circle cx={rBase * -0.4} cy={rBase * -0.4} r={rBase * 0.4} fill="#fff" />
          ) : null}
        </g>
      ))}
    </g>
  )
}

function Mouth({ mood, ink }: { mood: CreatureMood; ink: string }) {
  const y = HEAD.cy + 15
  if (mood === 'eating') {
    return <ellipse data-part="mouth-eating" cx={50} cy={y} rx={5} ry={4} fill={ink} />
  }
  if (mood === 'puzzled') {
    return <path data-part="mouth-puzzled" d={`M46 ${y} q4 -3 8 0`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
  }
  const w = mood === 'happy' ? 5 : 3.5
  return (
    <path
      data-part={`mouth-${mood}`}
      d={`M${50 - w} ${y} q${w} ${w} ${w * 2} 0`}
      stroke={ink}
      strokeWidth={2.2}
      fill="none"
      strokeLinecap="round"
    />
  )
}

// ─── per-animal parts ────────────────────────────────────────────────────────

function ears(animal: AnimalKind, [body, belly, ink]: P) {
  const L = { x: HEAD.cx - 18, y: HEAD.cy - 20 }
  const R = { x: HEAD.cx + 18, y: HEAD.cy - 20 }
  const pair = (node: (s: 1 | -1) => ReactNode) => (
    <g>
      <g transform={`translate(${L.x} ${L.y})`}>{node(-1)}</g>
      <g transform={`translate(${R.x} ${R.y})`}>{node(1)}</g>
    </g>
  )
  switch (animal) {
    case 'bunny':
      return pair((s) => (
        <g transform={`rotate(${s * 12})`}>
          <ellipse cx={0} cy={-14} rx={6} ry={16} fill={body} />
          <ellipse cx={0} cy={-14} rx={2.6} ry={11} fill={belly} />
        </g>
      ))
    case 'kitten':
    case 'foal':
    case 'fawn':
    case 'kid':
      return pair((s) => (
        <path d={`M0 6 L${s * 11} -12 L${s * 2} -4 Z`} fill={body} stroke={ink} strokeWidth={1} />
      ))
    case 'puppy':
    case 'lamb':
      return pair((s) => <ellipse cx={s * 3} cy={6} rx={7} ry={11} fill={body} />)
    case 'piglet':
      return pair((s) => <path d={`M0 4 L${s * 9} -8 L${s * -1} -6 Z`} fill={body} />)
    case 'calf':
      return pair((s) => <ellipse cx={s * 4} cy={2} rx={9} ry={6} fill={body} />)
    default: // chick, duckling, gosling — soft down tuft, no ears
      return null
  }
}

function topFeature(animal: AnimalKind, [body, belly, ink]: P) {
  switch (animal) {
    case 'chick':
      return (
        <g transform={`translate(${HEAD.cx} ${HEAD.cy - HEAD.r})`}>
          <path d="M-5 4 Q-6 -8 -1 -3 Q0 -12 4 -3 Q9 -9 6 4 Z" fill={ink} opacity={0.85} />
        </g>
      )
    case 'kid':
    case 'lamb':
      return (
        <g transform={`translate(${HEAD.cx} ${HEAD.cy - HEAD.r + 4})`}>
          <path d="M-8 0 Q-14 -8 -8 -12" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M8 0 Q14 -8 8 -12" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      )
    case 'calf':
      return (
        <g transform={`translate(${HEAD.cx} ${HEAD.cy - HEAD.r + 2})`}>
          <path d="M-9 2 q-3 -6 1 -8" stroke={belly} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          <path d="M9 2 q3 -6 -1 -8" stroke={belly} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          <ellipse cx={0} cy={-4} rx={9} ry={6} fill={body} />
        </g>
      )
    default:
      return null
  }
}

function snout(animal: AnimalKind, [, belly, ink]: P) {
  const y = HEAD.cy + 9
  switch (animal) {
    case 'chick':
    case 'duckling':
    case 'gosling':
      return (
        <path d={`M${50 - 6} ${y - 2} L${50 + 6} ${y - 2} L50 ${y + 6} Z`} fill="#F5A623" />
      )
    case 'piglet':
      return (
        <g>
          <ellipse cx={50} cy={y + 1} rx={9} ry={7} fill={belly} />
          <circle cx={47} cy={y + 1} r={1.6} fill={ink} />
          <circle cx={53} cy={y + 1} r={1.6} fill={ink} />
        </g>
      )
    case 'bunny':
      return (
        <>
          <path d={`M47 ${y} h6`} stroke={ink} strokeWidth={2} strokeLinecap="round" />
          <path d={`M50 ${y} v3`} stroke={ink} strokeWidth={2} strokeLinecap="round" />
        </>
      )
    default: // muzzle
      return (
        <g>
          <ellipse cx={50} cy={y + 2} rx={9} ry={7} fill={belly} />
          <ellipse cx={50} cy={y} rx={3} ry={2.4} fill={ink} />
        </g>
      )
  }
}

function tail(animal: AnimalKind, [body, belly]: P) {
  const base = { x: BODY.cx + BODY.rx - 2, y: BODY.cy + 2 }
  switch (animal) {
    case 'piglet':
      return <path d={`M${base.x} ${base.y} q10 -2 6 6 q-3 6 3 5`} stroke={body} strokeWidth={3} fill="none" strokeLinecap="round" />
    case 'bunny':
    case 'lamb':
      return <circle cx={base.x + 4} cy={base.y} r={6} fill={belly} />
    case 'kitten':
    case 'foal':
    case 'fawn':
    case 'calf':
      return <path d={`M${base.x} ${base.y} q12 0 12 -14`} stroke={body} strokeWidth={5} fill="none" strokeLinecap="round" />
    case 'puppy':
      return <path d={`M${base.x} ${base.y} q10 -6 4 -14`} stroke={body} strokeWidth={5} fill="none" strokeLinecap="round" />
    default: // birds — little wing/tail tuft
      return <path d={`M${base.x - 2} ${base.y - 2} q10 2 8 10 q-5 2 -9 -2 Z`} fill={belly} />
  }
}

export function CreatureSVG({ params, mood, size, className, title }: CreatureSVGProps) {
  const palette = params.palette as P
  const [body, belly, ink] = palette
  const bob = mood === 'idle' || mood === 'sleeping' ? 0 : mood === 'happy' ? -3 : 0

  return (
    <svg
      data-testid="creature"
      data-animal={params.animal}
      data-mood={mood}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title ?? params.animal}
    >
      {title ? <title>{title}</title> : null}
      <ellipse cx={50} cy={92} rx={26} ry={6} fill="#00000018" />

      <g transform={`translate(0 ${bob})`}>
        {tail(params.animal, palette)}

        {/* feet */}
        <ellipse cx={40} cy={90} rx={7} ry={5} fill={body} />
        <ellipse cx={60} cy={90} rx={7} ry={5} fill={body} />

        {/* body */}
        <ellipse cx={BODY.cx} cy={BODY.cy} rx={BODY.rx} ry={BODY.ry} fill={body} />
        <ellipse cx={BODY.cx} cy={BODY.cy + 3} rx={BODY.rx * 0.62} ry={BODY.ry * 0.62} fill={belly} />

        {/* head */}
        {ears(params.animal, palette)}
        <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={body} />
        <ellipse cx={HEAD.cx} cy={HEAD.cy + 9} rx={HEAD.r * 0.72} ry={HEAD.r * 0.62} fill={belly} opacity={0.55} />
        {topFeature(params.animal, palette)}

        {/* face */}
        <ellipse cx={HEAD.cx - 12} cy={HEAD.cy + 9} rx={4} ry={3} fill="#F48FB1" opacity={0.5} />
        <ellipse cx={HEAD.cx + 12} cy={HEAD.cy + 9} rx={4} ry={3} fill="#F48FB1" opacity={0.5} />
        <Eyes mood={mood} style={params.eyeStyle} ink={ink} />
        {snout(params.animal, palette)}
        <Mouth mood={mood} ink={ink} />

        {mood === 'sleeping' ? (
          <text data-part="zzz" x={72} y={26} fontSize={12} fill={ink} opacity={0.7}>
            z
          </text>
        ) : null}
      </g>
    </svg>
  )
}
