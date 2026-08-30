// The little scene above the number pad during a care round. It reacts to each
// correct answer: the trough fills, the broom sweeps a patch of dirt away, or
// the animal does a hop of a dance.
import { motion } from 'motion/react'
import type { CareTask, CreatureMood, HatchedCreature } from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'

export type CareSceneProps = {
  task: CareTask
  creature: HatchedCreature
  name: string
  /** correct answers so far */
  done: number
  /** questions in the round */
  total: number
}

const W = 240
const H = 190

export function CareScene({ task, creature, name, done, total }: CareSceneProps) {
  const frac = total > 0 ? Math.min(1, done / total) : 0
  const finished = done >= total

  if (task === 'feed' || task === 'water') {
    const troughY = 130
    const troughH = 34
    const fillH = troughH * frac
    const isWater = task === 'water'
    const mood: CreatureMood = finished ? 'eating' : 'content'
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 300 }} role="img" aria-label={`${name} at the trough, ${Math.round(frac * 100)}% full`}>
        {/* animal behind the trough */}
        <g transform="translate(70 -6)">
          <CreatureSVG params={creature.params} mood={mood} size={110} title={name} />
        </g>
        {/* trough */}
        <g>
          <path
            d={`M40 ${troughY} L200 ${troughY} L188 ${troughY + troughH + 6} L52 ${troughY + troughH + 6} Z`}
            fill="#9c6b3f"
          />
          <path
            d={`M46 ${troughY + 4} L194 ${troughY + 4} L184 ${troughY + troughH} L56 ${troughY + troughH} Z`}
            fill="#5d3c22"
          />
          {/* fill */}
          <motion.rect
            x={54}
            width={132}
            rx={3}
            fill={isWater ? '#38bdf8' : '#f4c430'}
            initial={false}
            y={troughY + troughH - fillH + 2}
            height={Math.max(0, fillH)}
            animate={{ y: troughY + troughH - fillH + 2, height: Math.max(0, fillH) }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          />
          {isWater && fillH > 3 ? (
            <motion.path
              d={`M54 ${troughY + troughH - fillH + 3} q22 -5 44 0 t44 0 t44 0`}
              stroke="#7dd3fc"
              strokeWidth={3}
              fill="none"
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          ) : null}
          {/* rim */}
          <line x1={40} y1={troughY} x2={200} y2={troughY} stroke="#b98a5a" strokeWidth={5} strokeLinecap="round" />
        </g>
        {finished ? <Sparkles /> : null}
      </svg>
    )
  }

  if (task === 'clean') {
    // fixed dirt spots; hide one more with each correct answer
    const spots = [
      { x: 55, y: 120, r: 13 },
      { x: 120, y: 145, r: 15 },
      { x: 175, y: 118, r: 12 },
      { x: 95, y: 100, r: 10 },
      { x: 150, y: 150, r: 11 },
      { x: 70, y: 155, r: 10 },
    ].slice(0, total)
    const remaining = spots.slice(done)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 300 }} role="img" aria-label={`sweeping ${name}'s stall, ${done} of ${total} clean`}>
        {/* floor planks */}
        <rect x={20} y={78} width={200} height={96} rx={8} fill="#c9a06a" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={20} y1={95 + i * 20} x2={220} y2={95 + i * 20} stroke="#a9743f" strokeWidth={2} opacity={0.5} />
        ))}
        {/* animal to the side */}
        <g transform="translate(150 -10)">
          <CreatureSVG params={creature.params} mood={finished ? 'happy' : 'content'} size={90} title={name} />
        </g>
        {/* dirt */}
        {remaining.map((s, i) => (
          <g key={i} fill="#6b4a2b">
            <ellipse cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.7} />
            <ellipse cx={s.x + s.r * 0.6} cy={s.y - 3} rx={s.r * 0.5} ry={s.r * 0.4} />
          </g>
        ))}
        {/* broom sweep on each answer */}
        {done > 0 && !finished ? (
          <motion.g
            key={done}
            initial={{ x: -30, rotate: -25, opacity: 0 }}
            animate={{ x: [-30, 120, 200], rotate: [-25, 8, -8], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            <rect x={-2} y={-46} width={4} height={44} rx={2} fill="#8d6e63" />
            <path d="M-12 -4 L12 -4 L16 12 L-16 12 Z" fill="#e0a955" />
            {[-10, -5, 0, 5, 10].map((o) => (
              <line key={o} x1={o} y1={-2} x2={o * 1.6} y2={14} stroke="#a9743f" strokeWidth={2} />
            ))}
          </motion.g>
        ) : null}
        {finished ? <Sparkles /> : null}
      </svg>
    )
  }

  // play — the animal dances with every correct answer
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 300 }} role="img" aria-label={`playing with ${name}`}>
      <ellipse cx={W / 2} cy={162} rx={44} ry={9} fill="#00000012" />
      <motion.g
        key={done}
        style={{ transformOrigin: '120px 160px' }}
        animate={
          done === 0
            ? { rotate: 0, y: 0 }
            : { rotate: done % 2 ? [-12, 12, -6, 0] : [12, -12, 6, 0], y: [0, -18, 0, -8, 0] }
        }
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        <g transform="translate(65 30)">
          <CreatureSVG params={creature.params} mood={done > 0 ? 'happy' : 'content'} size={110} title={name} />
        </g>
      </motion.g>
      {/* a bouncing ball */}
      <motion.g
        animate={{ x: [40, 200, 40], y: [150, 60, 150] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle r={9} fill="#ef5350" />
      </motion.g>
      {done > 0 ? (
        <motion.g key={`n${done}`} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -40 }} transition={{ duration: 0.9 }}>
          <text x={165} y={70} fontSize={20}>🎵</text>
          <text x={195} y={95} fontSize={16}>⭐</text>
        </motion.g>
      ) : null}
    </svg>
  )
}

function Sparkles() {
  return (
    <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 1], scale: 1 }} transition={{ duration: 0.5 }}>
      {[[60, 60], [180, 55], [120, 40], [200, 110], [45, 105]].map(([x, y], i) => (
        <text key={i} x={x} y={y} fontSize={16}>✨</text>
      ))}
    </motion.g>
  )
}
