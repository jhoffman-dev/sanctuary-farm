// Soft-vector storybook creature. Pure SVG, square 0..100 viewBox, scales to
// `size`. Everything is drawn from CreatureParams + the current mood; there is
// no randomness at render time, so coordinates are always finite. Tuned to sit
// cleanly inside the viewBox at both 200 px and 64 px.
import { useId } from 'react'
import type { CreatureParams, CreatureMood, CreatureSVGProps } from '@/contracts'

type Geom = { cx: number; cy: number; rx: number; ry: number }

const BODY_GEOM: Record<CreatureParams['bodyShape'], Geom> = {
  round: { cx: 50, cy: 57, rx: 30, ry: 30 },
  tall: { cx: 50, cy: 55, rx: 23, ry: 33 },
  wide: { cx: 50, cy: 62, rx: 35, ry: 25 },
  lumpy: { cx: 50, cy: 58, rx: 31, ry: 28 },
}

const INK = '#3a2f2a'
const BLUSH = '#F49CA0'
const MOUTH = '#7a4634'

function n(x: number): number {
  return Math.round(x * 100) / 100
}

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${n(cx + r * Math.cos(a))},${n(cy + r * Math.sin(a))}`)
  }
  return `M${pts.join('L')}Z`
}

function Ears({
  type,
  g,
  fill,
  accent,
}: {
  type: CreatureParams['earType']
  g: Geom
  fill: string
  accent: string
}) {
  if (type === 'none') return null
  const topY = g.cy - g.ry
  const off = Math.max(11, g.rx * 0.58)
  const lx = 50 - off
  const rx = 50 + off

  if (type === 'pointy') {
    const tip = Math.max(7, topY - 13)
    return (
      <g data-part="ears">
        <path
          d={`M${n(lx - 7)},${n(topY + 7)} Q${n(lx - 1)},${n(tip)} ${n(lx + 8)},${n(topY + 2)} Z`}
          fill={fill}
          stroke={accent}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <path
          d={`M${n(rx - 8)},${n(topY + 2)} Q${n(rx + 1)},${n(tip)} ${n(rx + 7)},${n(topY + 7)} Z`}
          fill={fill}
          stroke={accent}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </g>
    )
  }

  if (type === 'floppy') {
    return (
      <g data-part="ears">
        <ellipse
          cx={n(lx + 2)}
          cy={n(topY + 12)}
          rx={7}
          ry={15}
          transform={`rotate(-24 ${n(lx + 2)} ${n(topY + 12)})`}
          fill={fill}
          stroke={accent}
          strokeWidth={1.6}
        />
        <ellipse
          cx={n(rx - 2)}
          cy={n(topY + 12)}
          rx={7}
          ry={15}
          transform={`rotate(24 ${n(rx - 2)} ${n(topY + 12)})`}
          fill={fill}
          stroke={accent}
          strokeWidth={1.6}
        />
      </g>
    )
  }

  if (type === 'round') {
    const ey = Math.max(11, topY + 2)
    return (
      <g data-part="ears">
        <circle cx={n(lx)} cy={n(ey)} r={9} fill={fill} stroke={accent} strokeWidth={1.6} />
        <circle cx={n(rx)} cy={n(ey)} r={9} fill={fill} stroke={accent} strokeWidth={1.6} />
      </g>
    )
  }

  // antenna
  const baseY = topY + 3
  const tipY = Math.max(9, topY - 12)
  return (
    <g data-part="ears" stroke={accent} strokeWidth={2.2} strokeLinecap="round">
      <line x1={n(50 - 9)} y1={n(baseY)} x2={n(50 - 13)} y2={n(tipY)} />
      <line x1={n(50 + 9)} y1={n(baseY)} x2={n(50 + 13)} y2={n(tipY)} />
      <circle cx={n(50 - 13)} cy={n(tipY)} r={3.4} fill={fill} strokeWidth={1.4} />
      <circle cx={n(50 + 13)} cy={n(tipY)} r={3.4} fill={fill} strokeWidth={1.4} />
    </g>
  )
}

function Tail({
  type,
  g,
  fill,
  accent,
}: {
  type: CreatureParams['tail']
  g: Geom
  fill: string
  accent: string
}) {
  if (type === 'none') return null
  const bx = 50 + Math.min(g.rx, 28)
  const by = g.cy + g.ry * 0.3

  if (type === 'puff') {
    return (
      <circle
        data-part="tail"
        cx={n(bx - 2)}
        cy={n(by + 4)}
        r={8}
        fill={fill}
        stroke={accent}
        strokeWidth={1.6}
      />
    )
  }
  if (type === 'long') {
    return (
      <path
        data-part="tail"
        d={`M${n(bx - 6)},${n(by)} Q${n(bx + 10)},${n(by - 6)} ${n(bx + 8)},${n(by + 14)}`}
        fill="none"
        stroke={fill}
        strokeWidth={6}
        strokeLinecap="round"
      />
    )
  }
  // curl
  return (
    <path
      data-part="tail"
      d={`M${n(bx - 6)},${n(by + 2)} q11,-3 11,6 q0,9 -9,9 q-6,0 -5,-7`}
      fill="none"
      stroke={fill}
      strokeWidth={5}
      strokeLinecap="round"
    />
  )
}

function Eye({
  x,
  y,
  kind,
  fill,
}: {
  x: number
  y: number
  kind: CreatureParams['eyeStyle'] | 'closed' | 'happy' | 'squint'
  fill: string
}) {
  if (kind === 'closed') {
    return (
      <path
        d={`M${n(x - 5)},${n(y)} Q${n(x)},${n(y + 4)} ${n(x + 5)},${n(y)}`}
        fill="none"
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
      />
    )
  }
  if (kind === 'happy') {
    return (
      <path
        d={`M${n(x - 5)},${n(y + 2)} Q${n(x)},${n(y - 5)} ${n(x + 5)},${n(y + 2)}`}
        fill="none"
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
      />
    )
  }
  if (kind === 'squint') {
    return (
      <path
        d={`M${n(x - 5)},${n(y + 1)} Q${n(x)},${n(y - 2)} ${n(x + 5)},${n(y + 1)}`}
        fill="none"
        stroke={INK}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    )
  }

  const white = kind === 'wide' ? 9 : kind === 'big' ? 8 : 7.4
  const pupil = kind === 'wide' ? 3.1 : kind === 'big' ? 4 : 3.6
  return (
    <g>
      <circle cx={n(x)} cy={n(y)} r={white} fill="#fff" stroke={INK} strokeWidth={1.2} />
      {kind === 'sleepy' ? (
        <path
          d={`M${n(x - white)},${n(y - 1)} A${white} ${white} 0 0 1 ${n(x + white)},${n(y - 1)} Z`}
          fill={fill}
        />
      ) : null}
      <circle cx={n(x + 0.6)} cy={n(y + (kind === 'sleepy' ? 2 : 1))} r={pupil} fill={INK} />
      <circle cx={n(x - 1.6)} cy={n(y - 1.6)} r={1.5} fill="#fff" />
      {kind === 'sparkly' ? (
        <>
          <circle cx={n(x + 2.4)} cy={n(y + 2.6)} r={1} fill="#fff" />
          <path
            d={starPath(x + white * 0.7, y - white * 0.7, 2.2, 0.9)}
            fill="#fff"
          />
        </>
      ) : null}
    </g>
  )
}

function Mouth({ mood, cx, cy }: { mood: CreatureMood; cx: number; cy: number }) {
  if (mood === 'eating') {
    return (
      <g data-part={`mouth-${mood}`}>
        <ellipse cx={n(cx)} cy={n(cy + 1)} rx={5} ry={6} fill={MOUTH} />
        <ellipse cx={n(cx)} cy={n(cy + 4)} rx={3.4} ry={3} fill={BLUSH} />
      </g>
    )
  }
  if (mood === 'happy') {
    return (
      <path
        data-part={`mouth-${mood}`}
        d={`M${n(cx - 10)},${n(cy - 1)} Q${n(cx)},${n(cy + 12)} ${n(cx + 10)},${n(cy - 1)} Q${n(cx)},${n(cy + 4)} ${n(cx - 10)},${n(cy - 1)} Z`}
        fill={MOUTH}
      />
    )
  }
  if (mood === 'puzzled') {
    return (
      <circle data-part={`mouth-${mood}`} cx={n(cx + 3)} cy={n(cy)} r={2.6} fill={MOUTH} />
    )
  }
  if (mood === 'sleeping') {
    return (
      <path
        data-part={`mouth-${mood}`}
        d={`M${n(cx - 3)},${n(cy)} Q${n(cx)},${n(cy + 2.5)} ${n(cx + 3)},${n(cy)}`}
        fill="none"
        stroke={INK}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    )
  }
  // idle
  return (
    <path
      data-part={`mouth-${mood}`}
      d={`M${n(cx - 7)},${n(cy)} Q${n(cx)},${n(cy + 6)} ${n(cx + 7)},${n(cy)}`}
      fill="none"
      stroke={INK}
      strokeWidth={2}
      strokeLinecap="round"
    />
  )
}

export function CreatureSVG({ params, mood, size, className, title }: CreatureSVGProps) {
  const rawId = useId()
  const uid = `cr${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const g = BODY_GEOM[params.bodyShape]
  const [body, belly, accent] = params.palette

  const eyeSpread = Math.max(9, g.rx * 0.36)
  const eyeY = g.cy - g.ry * 0.14
  const lx = 50 - eyeSpread
  const rx = 50 + eyeSpread
  const mouthCy = g.cy + g.ry * 0.24

  const eyeKind: Parameters<typeof Eye>[0]['kind'] =
    mood === 'sleeping' ? 'closed' : mood === 'happy' ? 'happy' : params.eyeStyle
  const eyesLabel = mood === 'sleeping' ? 'closed' : mood === 'happy' ? 'happy' : params.eyeStyle

  const bellyCy = g.cy + g.ry * 0.32

  return (
    <svg
      data-creature=""
      data-mood={mood}
      data-body={params.bodyShape}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title ?? undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={`${uid}-body`}>
          <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} />
        </clipPath>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor={INK} floodOpacity="0.18" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx={50} cy={90} rx={n(g.rx * 0.82)} ry={4} fill={INK} opacity={0.12} />

      <Tail type={params.tail} g={g} fill={body} accent={accent} />

      {/* feet */}
      <ellipse cx={n(50 - g.rx * 0.42)} cy={n(g.cy + g.ry - 2)} rx={7} ry={4.5} fill={accent} />
      <ellipse cx={n(50 + g.rx * 0.42)} cy={n(g.cy + g.ry - 2)} rx={7} ry={4.5} fill={accent} />

      <g filter={`url(#${uid}-soft)`}>
        <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fill={body} />
        {params.bodyShape === 'lumpy' ? (
          <>
            <circle cx={38} cy={n(g.cy - g.ry + 7)} r={10} fill={body} />
            <circle cx={63} cy={n(g.cy - g.ry + 4)} r={8} fill={body} />
            <circle cx={n(50 + g.rx - 4)} cy={n(g.cy + 4)} r={9} fill={body} />
          </>
        ) : null}
        <g clipPath={`url(#${uid}-body)`}>
          <ellipse
            cx={50}
            cy={n(bellyCy)}
            rx={n(g.rx * 0.6)}
            ry={n(g.ry * 0.58)}
            fill={belly}
            opacity={0.9}
          />
          {params.pattern === 'spots'
            ? [
                [-13, 5],
                [11, 11],
                [-4, -9],
                [15, -3],
                [3, 19],
              ].map(([dx, dy], i) => (
                <circle
                  key={i}
                  cx={n(50 + dx)}
                  cy={n(g.cy + dy)}
                  r={4.4}
                  fill={accent}
                  opacity={0.5}
                />
              ))
            : null}
          {params.pattern === 'stripes'
            ? [-17, -6, 6, 17].map((dx, i) => (
                <path
                  key={i}
                  d={`M${n(50 + dx)},${n(g.cy - g.ry - 2)} q7,${n(g.ry)} 0,${n(g.ry * 2 + 4)}`}
                  fill="none"
                  stroke={accent}
                  strokeWidth={5}
                  opacity={0.38}
                />
              ))
            : null}
          {params.pattern === 'star' ? (
            <path d={starPath(50, bellyCy, 11, 4.6)} fill={accent} opacity={0.7} />
          ) : null}
        </g>
        <ellipse
          cx={g.cx}
          cy={g.cy}
          rx={g.rx}
          ry={g.ry}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          opacity={0.35}
        />
      </g>

      <Ears type={params.earType} g={g} fill={body} accent={accent} />

      {/* face */}
      <g data-part="eyes" data-eyes={eyesLabel}>
        <Eye x={lx} y={eyeY} kind={mood === 'puzzled' ? 'squint' : eyeKind} fill={body} />
        <Eye x={rx} y={eyeY} kind={eyeKind} fill={body} />
      </g>

      {mood === 'puzzled' ? (
        <path
          data-part="eyebrow"
          d={`M${n(rx - 6)},${n(eyeY - 11)} L${n(rx + 6)},${n(eyeY - 14)}`}
          stroke={INK}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      ) : null}

      {/* cheeks */}
      <ellipse cx={n(lx - 4)} cy={n(eyeY + 7)} rx={4} ry={2.6} fill={BLUSH} opacity={0.5} />
      <ellipse cx={n(rx + 4)} cy={n(eyeY + 7)} rx={4} ry={2.6} fill={BLUSH} opacity={0.5} />

      {/* nose */}
      <ellipse cx={50} cy={n(mouthCy - 6)} rx={2.6} ry={2} fill={accent} />

      <Mouth mood={mood} cx={50} cy={mouthCy} />

      {mood === 'sleeping' ? (
        <g data-part="zzz" fill={INK} fontFamily="Georgia, 'Times New Roman', serif">
          <text x={n(rx + 8)} y={n(eyeY - 8)} fontSize="9">
            z
          </text>
          <text x={n(rx + 14)} y={n(eyeY - 16)} fontSize="12">
            Z
          </text>
        </g>
      ) : null}
    </svg>
  )
}
