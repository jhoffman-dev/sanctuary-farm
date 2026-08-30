// Storybook farm-animal renderer. The `animal` field picks a distinct silhouette
// (chicken, cow, horse, sheep, goat, dog, cat, duck, ...), `palette` tints it,
// `mood` drives eyes and mouth. Square 0 0 100 100 viewBox, scales to `size`.
import type { ReactNode } from 'react'
import type { AnimalKind, CreatureMood, CreatureSVGProps } from '@/contracts'

type P = [string, string, string] // body, belly/accent, ink

const HEAD = { cx: 50, cy: 44, r: 26 }

// ─── eyes + mouth (mood-driven; shared across species) ───────────────────────

function Eyes({ mood, style, ink }: { mood: CreatureMood; style: string; ink: string }) {
  const y = HEAD.cy + 1
  const dx = 9.5
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
  if (mood === 'sad') {
    return (
      <g data-part="eyes" data-eyes="sad">
        <path data-part="eyebrow" d={`M${50 - dx - 6} ${y - 6} q6 4 11 2`} stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d={`M${50 + dx - 5} ${y - 4} q6 -2 11 -2`} stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
        <ellipse cx={50 - dx} cy={y + 1} rx={3.2} ry={3.2} fill={ink} />
        <ellipse cx={50 + dx} cy={y + 1} rx={3.2} ry={3.2} fill={ink} />
      </g>
    )
  }
  const rBase = style === 'sleepy' ? 3 : style === 'wide' ? 4.8 : 4
  const squint = mood === 'puzzled'
  return (
    <g data-part="eyes" data-eyes={squint ? `squint-${style}` : style}>
      {squint ? <path data-part="eyebrow" d={`M${50 - dx - 5} ${y - 8} q5 -3 10 0`} stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" /> : null}
      {[-dx, dx].map((ox, i) => (
        <g key={i} transform={`translate(${50 + ox} ${y}) ${squint && i === 0 ? 'scale(1 0.55)' : ''}`}>
          <ellipse rx={rBase} ry={style === 'sleepy' ? rBase * 0.7 : rBase} fill={ink} />
          {style === 'sparkly' || style === 'big' || mood === 'content' ? (
            <circle cx={rBase * -0.4} cy={rBase * -0.4} r={rBase * 0.4} fill="#fff" />
          ) : null}
        </g>
      ))}
    </g>
  )
}

function Mouth({ mood, ink, y }: { mood: CreatureMood; ink: string; y: number }) {
  if (mood === 'eating') return <ellipse data-part="mouth-eating" cx={50} cy={y} rx={5} ry={4} fill={ink} />
  if (mood === 'puzzled')
    return <path data-part="mouth-puzzled" d={`M46 ${y} q4 -3 8 0`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
  if (mood === 'sad')
    return <path data-part="mouth-sad" d={`M45 ${y + 3} q5 -5 10 0`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
  const w = mood === 'happy' ? 5 : mood === 'content' ? 4.2 : 3.5
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

// ─── per-species parts ──────────────────────────────────────────────────────

const earPair = (lx: number, ly: number, node: (s: 1 | -1) => ReactNode) => (
  <g>
    <g transform={`translate(${HEAD.cx - lx} ${HEAD.cy - ly})`}>{node(-1)}</g>
    <g transform={`translate(${HEAD.cx + lx} ${HEAD.cy - ly})`}>{node(1)}</g>
  </g>
)

type SpeciesArt = {
  behind?: (p: P) => ReactNode // tail / neck, drawn before the body
  ears?: (p: P) => ReactNode // behind the head
  face?: (p: P, mouthY: number) => ReactNode // muzzle / beak / nose, over the head
  crown?: (p: P) => ReactNode // horns / comb, over everything
  bodyPattern?: (p: P) => ReactNode
  mouthY?: number
}

const B = { cx: 50, cy: 78, rx: 20, ry: 14 }

const SPECIES: Record<AnimalKind, SpeciesArt> = {
  chick: {
    ears: () => null,
    behind: ([, belly]) => <path d={`M${B.cx + B.rx - 4} ${B.cy} q12 -3 9 8 q-4 5 -8 1 Z`} fill={belly} />,
    crown: ([, , ink]) => (
      <path d={`M${HEAD.cx - 5} ${HEAD.cy - HEAD.r + 4} q-1 -8 4 -5 q1 -8 4 -2 q6 -5 5 5`} fill={ink} opacity={0.8} />
    ),
    face: (_p, y) => <path d={`M${50 - 6} ${y - 3} L${50 + 6} ${y - 3} L50 ${y + 6} Z`} fill="#F5A623" />,
    mouthY: HEAD.cy + 12,
  },
  duck: {
    ears: () => null,
    behind: ([body]) => <path d={`M${B.cx + B.rx - 6} ${B.cy - 3} q14 0 12 -12`} stroke={body} strokeWidth={7} fill="none" strokeLinecap="round" />,
    face: (_p, y) => (
      <g>
        <ellipse cx={50} cy={y + 1} rx={12} ry={6} fill="#F5A623" />
        <ellipse cx={50} cy={y + 3} rx={12} ry={4} fill="#e0912f" />
      </g>
    ),
    mouthY: HEAD.cy + 11,
  },
  goose: {
    ears: () => null,
    behind: ([body]) => (
      <path d={`M${HEAD.cx} ${HEAD.cy + 8} q-16 6 -14 26`} stroke={body} strokeWidth={13} fill="none" strokeLinecap="round" />
    ),
    face: () => (
      <g>
        <ellipse cx={50} cy={HEAD.cy + 8} rx={9} ry={5} fill="#F5A623" />
        <circle cx={44} cy={HEAD.cy + 5} r={2} fill="#e0912f" />
      </g>
    ),
    mouthY: HEAD.cy + 13,
  },
  rabbit: {
    ears: ([body, belly]) =>
      earPair(7, 16, (s) => (
        <g transform={`rotate(${s * 10})`}>
          <ellipse cx={0} cy={-15} rx={6} ry={17} fill={body} />
          <ellipse cx={0} cy={-15} rx={2.6} ry={12} fill={belly} />
        </g>
      )),
    behind: ([, belly]) => <circle cx={B.cx + B.rx + 2} cy={B.cy + 2} r={7} fill={belly} />,
    face: ([, , ink], y) => (
      <g>
        <path d={`M${50 - 4} ${y - 2} h8`} stroke={ink} strokeWidth={2} strokeLinecap="round" />
        <path d={`M50 ${y - 2} v3`} stroke={ink} strokeWidth={2} strokeLinecap="round" />
        <path d={`M46 ${y + 4} q4 3 0 6 M54 ${y + 4} q-4 3 0 6`} stroke="#fff" strokeWidth={2} fill="none" />
      </g>
    ),
    mouthY: HEAD.cy + 10,
  },
  cat: {
    ears: ([body, belly, ink]) =>
      earPair(15, 14, (s) => (
        <g>
          <path d={`M0 8 L${s * 13} -12 L${s * -1} -5 Z`} fill={body} stroke={ink} strokeWidth={1} />
          <path d={`M${s * 2} 4 L${s * 8} -7 L${s * 1} -2 Z`} fill={belly} />
        </g>
      )),
    behind: ([body]) => <path d={`M${B.cx + B.rx - 4} ${B.cy} q16 2 12 -16 q-3 -6 3 -9`} stroke={body} strokeWidth={5} fill="none" strokeLinecap="round" />,
    face: ([, , ink], y) => (
      <g>
        <path d={`M${50 - 3} ${y - 3} L${50 + 3} ${y - 3} L50 ${y + 1} Z`} fill="#e8918f" />
        <g stroke={ink} strokeWidth={1.4} strokeLinecap="round">
          <path d={`M36 ${y} h-11 M36 ${y + 3} h-10`} />
          <path d={`M64 ${y} h11 M64 ${y + 3} h10`} />
        </g>
      </g>
    ),
    bodyPattern: ([, , ink]) => (
      <g stroke={ink} strokeWidth={2} opacity={0.35} strokeLinecap="round">
        <path d={`M${B.cx - 8} ${B.cy - 8} v12 M${B.cx} ${B.cy - 11} v14 M${B.cx + 8} ${B.cy - 8} v12`} />
      </g>
    ),
    mouthY: HEAD.cy + 8,
  },
  dog: {
    ears: ([body]) =>
      earPair(17, 12, (s) => <ellipse cx={s * 2} cy={7} rx={7.5} ry={13} fill={body} transform={`rotate(${s * 8})`} />),
    behind: ([body]) => <path d={`M${B.cx + B.rx - 5} ${B.cy - 2} q14 -3 10 -16`} stroke={body} strokeWidth={6} fill="none" strokeLinecap="round" />,
    face: ([, belly, ink], y) => (
      <g>
        <ellipse cx={50} cy={y - 1} rx={11} ry={8} fill={belly} />
        <ellipse cx={50} cy={y - 4} rx={4} ry={3} fill={ink} />
        <path d={`M50 ${y - 1} v5`} stroke={ink} strokeWidth={1.6} />
      </g>
    ),
    mouthY: HEAD.cy + 12,
  },
  pig: {
    ears: ([body]) => earPair(14, 15, (s) => <path d={`M0 6 L${s * 9} -9 L${s * -2} -7 Z`} fill={body} />),
    behind: ([, , ink]) => (
      <path d={`M${B.cx + B.rx - 4} ${B.cy} q9 -1 6 6 q-3 6 3 5`} stroke={ink} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.6} />
    ),
    face: ([, belly, ink], y) => (
      <g>
        <ellipse cx={50} cy={y} rx={10} ry={8} fill={belly} />
        <ellipse cx={46} cy={y} rx={1.8} ry={2.4} fill={ink} />
        <ellipse cx={54} cy={y} rx={1.8} ry={2.4} fill={ink} />
      </g>
    ),
    mouthY: HEAD.cy + 15,
  },
  sheep: {
    ears: ([, , ink]) => earPair(23, 2, (s) => <ellipse cx={s * 2} cy={2} rx={5} ry={3.5} fill={ink} opacity={0.55} />),
    crown: ([, belly]) => (
      <g fill={belly}>
        {[[-16, -18], [0, -22], [16, -18], [-22, -6], [22, -6], [-8, -24], [8, -24]].map(([x, yy], i) => (
          <circle key={i} cx={HEAD.cx + x} cy={HEAD.cy + yy} r={11} />
        ))}
      </g>
    ),
    bodyPattern: ([, belly]) => (
      <g fill={belly}>
        {[[-12, -6], [0, -10], [12, -6], [-6, 2], [7, 2]].map(([x, yy], i) => (
          <circle key={i} cx={B.cx + x} cy={B.cy + yy} r={9} />
        ))}
      </g>
    ),
    face: ([, , ink], y) => <ellipse cx={50} cy={y - 2} rx={3} ry={2.2} fill={ink} />,
    mouthY: HEAD.cy + 13,
  },
  goat: {
    ears: ([body]) => earPair(21, 4, (s) => <ellipse cx={s * 4} cy={4} rx={8} ry={4} fill={body} transform={`rotate(${s * 12})`} />),
    crown: ([, , ink]) =>
      earPair(8, 20, (s) => <path d={`M0 4 q${s * 3} -10 ${s * -2} -16`} stroke={ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />),
    face: ([, belly, ink], y) => (
      <g>
        <ellipse cx={50} cy={y - 1} rx={8} ry={6} fill={belly} />
        <ellipse cx={50} cy={y - 3} rx={3} ry={2} fill={ink} />
        <path d={`M46 ${y + 6} q4 8 8 0`} fill={belly} stroke={ink} strokeWidth={1} />
      </g>
    ),
    mouthY: HEAD.cy + 11,
  },
  horse: {
    ears: ([body, belly]) =>
      earPair(12, 20, (s) => (
        <g>
          <path d={`M0 6 L${s * 5} -12 L${s * -4} -3 Z`} fill={body} />
          <path d={`M${s * 0.5} 3 L${s * 3} -7 L${s * -1.5} -1 Z`} fill={belly} />
        </g>
      )),
    behind: ([, , ink]) => (
      <path d={`M${B.cx + B.rx - 6} ${B.cy - 2} q10 0 12 16 q-3 6 -9 6`} fill={ink} opacity={0.7} />
    ),
    crown: ([, , ink]) => (
      <path
        d={`M${HEAD.cx - 4} ${HEAD.cy - HEAD.r} q-8 6 -6 20 q4 -3 6 -8 q0 6 3 10 q3 -6 3 -14 q4 6 4 12 q4 -8 2 -18`}
        fill={ink}
        opacity={0.8}
      />
    ),
    face: ([body, belly, ink], y) => (
      <g>
        <ellipse cx={50} cy={y - 2} rx={12} ry={13} fill={body} />
        <ellipse cx={50} cy={y + 5} rx={9} ry={7} fill={belly} />
        <ellipse cx={46} cy={y + 5} rx={1.6} ry={2} fill={ink} />
        <ellipse cx={54} cy={y + 5} rx={1.6} ry={2} fill={ink} />
      </g>
    ),
    mouthY: HEAD.cy + 24,
  },
  donkey: {
    ears: ([body, belly]) =>
      earPair(9, 18, (s) => (
        <g transform={`rotate(${s * 8})`}>
          <ellipse cx={0} cy={-14} rx={5.5} ry={16} fill={body} />
          <ellipse cx={0} cy={-14} rx={2.4} ry={11} fill={belly} />
        </g>
      )),
    behind: ([, , ink]) => <path d={`M${B.cx + B.rx - 5} ${B.cy} q12 2 12 16`} stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />,
    crown: ([, , ink]) => <path d={`M${HEAD.cx} ${HEAD.cy - HEAD.r} q-3 8 0 16 q3 -8 0 -16`} stroke={ink} strokeWidth={4} fill="none" />,
    face: ([, belly, ink], y) => (
      <g>
        <ellipse cx={50} cy={y} rx={11} ry={9} fill={belly} />
        <ellipse cx={46} cy={y} rx={1.7} ry={2.2} fill={ink} />
        <ellipse cx={54} cy={y} rx={1.7} ry={2.2} fill={ink} />
      </g>
    ),
    mouthY: HEAD.cy + 16,
  },
  cow: {
    ears: ([body]) => earPair(25, 0, (s) => <ellipse cx={s * 2} cy={2} rx={8.5} ry={5.5} fill={body} transform={`rotate(${s * 12})`} />),
    crown: ([, , ink]) => (
      <g>
        {earPair(8, 20, (s) => (
          <path d={`M0 3 q${s * 3} -7 ${s * 7} -3`} stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.85} />
        ))}
        <path d={`M${HEAD.cx - 7} ${HEAD.cy - HEAD.r + 5} q7 -8 14 0`} fill={ink} opacity={0.3} />
      </g>
    ),
    behind: ([, , ink]) => (
      <path d={`M${B.cx + B.rx - 4} ${B.cy} q11 3 10 15`} stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
    ),
    bodyPattern: ([, , ink]) => (
      <g fill={ink} opacity={0.22}>
        <ellipse cx={B.cx - 9} cy={B.cy - 3} rx={6} ry={5} />
        <ellipse cx={B.cx + 8} cy={B.cy + 3} rx={5} ry={4} />
      </g>
    ),
    face: ([, belly, ink], y) => (
      <g>
        <ellipse cx={50} cy={y + 1} rx={13} ry={9.5} fill={belly} />
        <ellipse cx={44.5} cy={y} rx={2} ry={2.7} fill={ink} />
        <ellipse cx={55.5} cy={y} rx={2} ry={2.7} fill={ink} />
      </g>
    ),
    mouthY: HEAD.cy + 15,
  },
}

export function CreatureSVG({ params, mood, size, className, title }: CreatureSVGProps) {
  const palette = params.palette as P
  const [body, belly, ink] = palette
  const art = SPECIES[params.animal] ?? SPECIES.cow
  const mouthY = art.mouthY ?? HEAD.cy + 14
  const bob = mood === 'happy' ? -3 : mood === 'sad' ? 1 : 0

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
      <ellipse cx={50} cy={93} rx={25} ry={5.5} fill="#00000018" />

      <g transform={`translate(0 ${bob})`}>
        {art.behind?.(palette)}

        {/* feet */}
        <ellipse cx={38} cy={90} rx={7} ry={5} fill={body} />
        <ellipse cx={62} cy={90} rx={7} ry={5} fill={body} />

        {/* body */}
        <ellipse cx={B.cx} cy={B.cy} rx={B.rx} ry={B.ry} fill={body} />
        <ellipse cx={B.cx} cy={B.cy + 3} rx={B.rx * 0.6} ry={B.ry * 0.62} fill={belly} />
        {art.bodyPattern?.(palette)}

        {/* head */}
        {art.ears?.(palette)}
        <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={body} />
        {art.crown?.(palette)}

        {/* face */}
        <ellipse cx={HEAD.cx - 11} cy={HEAD.cy + 8} rx={3.6} ry={2.6} fill="#F48FB1" opacity={0.45} />
        <ellipse cx={HEAD.cx + 11} cy={HEAD.cy + 8} rx={3.6} ry={2.6} fill="#F48FB1" opacity={0.45} />
        <Eyes mood={mood} style={params.eyeStyle} ink={ink} />
        {art.face?.(palette, mouthY)}
        <Mouth mood={mood} ink={ink} y={mouthY} />

        {mood === 'sleeping' ? (
          <text data-part="zzz" x={72} y={24} fontSize={12} fill={ink} opacity={0.7}>
            z
          </text>
        ) : null}
      </g>
    </svg>
  )
}
