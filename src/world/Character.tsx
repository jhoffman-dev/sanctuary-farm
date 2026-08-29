// The round-headed keeper the player walks around as. Four facing variants,
// derived by the caller from the movement vector. Bob-and-squash while moving.
// Inline SVG only.
import type { CharacterFacing } from '@/contracts'
import { TILE_PX } from '@/contracts'

export type CharacterProps = {
  facing: CharacterFacing
  moving: boolean
}

const SKIN = '#f3c19a'
const SHIRT = '#4c8577'
const HAIR = '#5b3a29'
const BOOT = '#3a2a20'

export function Character({ facing, moving }: CharacterProps) {
  const back = facing === 'up'
  const side = facing === 'left' || facing === 'right'
  const flip = facing === 'left'

  return (
    <svg width={TILE_PX} height={TILE_PX} viewBox="0 0 48 48">
      <style>{`
        @keyframes sf-bob {
          0%,100% { transform: translateY(0) scaleY(1); }
          50%     { transform: translateY(-2px) scaleY(1.05); }
        }
      `}</style>
      <ellipse cx="24" cy="44" rx="9" ry="2.5" fill="rgba(0,0,0,0.18)" />
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
        {/* head */}
        <circle cx="24" cy="15" r="11" fill={SKIN} />
        {/* hair — a fuller cap from behind */}
        <path
          d={
            back
              ? 'M12 17a12 12 0 0 1 24 0v3a12 12 0 0 1-24 0z'
              : 'M12 15a12 12 0 0 1 24 0c0-7-5-11-12-11S12 8 12 15z'
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
      </g>
    </svg>
  )
}
