// The keeper the player walks around as — a farmhand in a cowboy hat. Four
// facing variants, derived by the caller from the movement vector. Bob-and-squash
// while moving. Inline SVG only.
import type { CharacterFacing } from '@/contracts'
import { TILE_PX } from '@/contracts'

export type CharacterProps = {
  facing: CharacterFacing
  moving: boolean
  /** rendered px (square). Defaults to one tile. */
  size?: number
}

const SKIN = '#f3c19a'
const SHIRT = '#4c8577'
const HAIR = '#5b3a29'
const BOOT = '#3a2a20'
const HAT = '#a9743f'
const HAT_DARK = '#7d5230'
const BAND = '#3a2a20'

function CowboyHat({ back }: { back: boolean }) {
  return (
    <g>
      {/* brim */}
      <ellipse cx="24" cy="9" rx="18" ry="5" fill={HAT} />
      <ellipse cx="24" cy="9" rx="18" ry="5" fill="none" stroke={HAT_DARK} strokeWidth="1" />
      {/* crown */}
      <path d="M15 9 Q15 -3 24 -3 Q33 -3 33 9 Z" fill={HAT} />
      <path d="M15 9 Q15 -3 24 -3 Q33 -3 33 9 Z" fill={HAT_DARK} opacity="0.25" />
      {/* pinch */}
      {!back && <path d="M24 -3 v6" stroke={HAT_DARK} strokeWidth="1.5" strokeLinecap="round" />}
      {/* band */}
      <rect x="15" y="5.5" width="18" height="2.6" rx="1" fill={BAND} />
      {!back && <circle cx="30" cy="6.8" r="1.1" fill="#d9b26a" />}
    </g>
  )
}

export function Character({ facing, moving, size = TILE_PX }: CharacterProps) {
  const back = facing === 'up'
  const side = facing === 'left' || facing === 'right'
  const flip = facing === 'left'

  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <style>{`
        @keyframes sf-bob {
          0%,100% { transform: translateY(0) scaleY(1); }
          50%     { transform: translateY(-2px) scaleY(1.05); }
        }
      `}</style>
      <ellipse cx="24" cy="44" rx="10" ry="3" fill="rgba(0,0,0,0.18)" />
      <g
        transform={flip ? 'translate(48 0) scale(-1 1)' : undefined}
        style={
          moving
            ? { animation: 'sf-bob 0.42s ease-in-out infinite', transformOrigin: '24px 42px' }
            : undefined
        }
      >
        {/* boots */}
        <rect x="18" y="38" width="5" height="5" rx="2" fill={BOOT} />
        <rect x="25" y="38" width="5" height="5" rx="2" fill={BOOT} />
        {/* body */}
        <rect x="15" y="23" width="18" height="17" rx="8" fill={SHIRT} />
        <path d="M15 27 h18" stroke="#3f6f63" strokeWidth="1.5" />
        {/* head */}
        <circle cx="24" cy="15" r="11" fill={SKIN} />
        {/* hair peeking below the hat */}
        <path
          d={
            back
              ? 'M13 18a11 11 0 0 0 22 0v2a11 11 0 0 1-22 0z'
              : 'M13 16q3 4 11 4t11-4q0 3-1 5-4 3-10 3t-10-3q-1-2-1-5z'
          }
          fill={HAIR}
        />
        {!back && !side && (
          <>
            <circle cx="20" cy="16" r="1.7" fill="#2b2b2b" />
            <circle cx="28" cy="16" r="1.7" fill="#2b2b2b" />
            <path d="M21 20q3 2.5 6 0" stroke="#8a5a3c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </>
        )}
        {!back && side && (
          <>
            <circle cx="28" cy="16" r="1.7" fill="#2b2b2b" />
            <path d="M33 16q2 1 0 3" stroke={SKIN} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}
        <CowboyHat back={back} />
      </g>
    </svg>
  )
}
