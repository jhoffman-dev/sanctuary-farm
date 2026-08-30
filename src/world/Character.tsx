// The keeper the player walks around as — a farmhand in a cowboy hat. Four
// facing variants (caller derives them from the movement vector). Bob-and-squash
// while moving. Inline SVG only. viewBox is 0 0 48 48, feet at the bottom.
import type { CharacterFacing } from '@/contracts'
import { TILE_PX } from '@/contracts'

export type CharacterProps = {
  facing: CharacterFacing
  moving: boolean
  /** rendered px (square). Defaults to one tile. */
  size?: number
}

const SKIN = '#f0c09a'
const SKIN_DK = '#d99e73'
const SHIRT = '#4c8577'
const BOOT = '#4a3526'
const HAT = '#b07a44'
const HAT_DK = '#8a5c30'
const HAIR = '#5b3a29'

/** A cowboy hat that sits on top of the head — brim + crown, no band over the face. */
function Hat() {
  return (
    <g>
      {/* crown */}
      <path d="M16 12 Q16 2 24 2 Q32 2 32 12 Z" fill={HAT} />
      {/* dented top */}
      <path d="M18 5 Q24 8 30 5" stroke={HAT_DK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* band, well above the face */}
      <rect x="16" y="9.5" width="16" height="2" fill={HAT_DK} />
      {/* brim */}
      <path d="M9 12 Q24 8 39 12 Q24 17 9 12 Z" fill={HAT} />
      <path d="M9 12 Q24 8 39 12" stroke={HAT_DK} strokeWidth="0.8" fill="none" />
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
          50%     { transform: translateY(-1.6px) scaleY(1.04); }
        }
      `}</style>
      <ellipse cx="24" cy="45" rx="10" ry="2.6" fill="rgba(0,0,0,0.18)" />
      <g
        transform={flip ? 'translate(48 0) scale(-1 1)' : undefined}
        style={
          moving
            ? { animation: 'sf-bob 0.4s ease-in-out infinite', transformOrigin: '24px 43px' }
            : undefined
        }
      >
        {/* boots */}
        <rect x="18" y="39" width="5.4" height="5" rx="2" fill={BOOT} />
        <rect x="24.6" y="39" width="5.4" height="5" rx="2" fill={BOOT} />
        {/* body */}
        <rect x="14.5" y="24" width="19" height="16" rx="8.5" fill={SHIRT} />
        <path d="M14.5 29 h19" stroke="#3f6f63" strokeWidth="1.4" />
        {/* arms hint */}
        <circle cx="14.5" cy="31" r="3.2" fill={SHIRT} />
        <circle cx="33.5" cy="31" r="3.2" fill={SHIRT} />

        {/* head */}
        <circle cx="24" cy="16" r="10.5" fill={SKIN} />
        {/* a little hair at the nape / sides, never across the face */}
        {back ? (
          <path d="M13.5 16 a10.5 10.5 0 0 0 21 0 a10.5 10.5 0 0 1 -21 0z" fill={HAIR} />
        ) : (
          <>
            <path d="M14 20 q-1 3 1 4" stroke={HAIR} strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d="M34 20 q1 3 -1 4" stroke={HAIR} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* face — in the lower half of the head, clear of the brim */}
        {!back && !side && (
          <>
            <circle cx="20" cy="18.5" r="1.6" fill="#3a2b22" />
            <circle cx="28" cy="18.5" r="1.6" fill="#3a2b22" />
            <path d="M21.5 22.5 q2.5 2 5 0" stroke="#a86a48" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </>
        )}
        {!back && side && (
          <>
            {/* facing RIGHT: eye near the front, nose bump on the right edge */}
            <circle cx="27" cy="18.5" r="1.6" fill="#3a2b22" />
            <path d="M33 17.5 q3 1.6 0 3.4" fill={SKIN} stroke={SKIN_DK} strokeWidth="0.6" />
            <path d="M28 23 q3 1.5 5 -0.2" stroke="#a86a48" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </>
        )}

        <Hat />
      </g>
    </svg>
  )
}
