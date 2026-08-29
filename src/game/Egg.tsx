// Nest-hollow egg. Purely a readout of scheduler.familyProgress(family):
// dull → glowing → cracked → hatching. It never earns anything.
import { EGG_CRACK_AT, EGG_GLOW_AT, EGG_HATCH_AT } from '@/contracts'
import { creatureParamsFor } from './creatureFor'

export type EggProps = { family: number; progress: number; size?: number }

export function Egg({ family, progress, size = 96 }: EggProps) {
  const [shell] = creatureParamsFor(family).palette
  const glowing = progress >= EGG_GLOW_AT
  const cracked = progress >= EGG_CRACK_AT
  const hatching = progress >= EGG_HATCH_AT
  const stage = hatching ? 'hatching' : cracked ? 'cracked' : glowing ? 'glowing' : 'dull'

  return (
    <svg width={size} height={size} viewBox="0 0 100 120" data-egg-stage={stage} role="img"
      aria-label={`egg for the ${family}s, ${Math.round(progress * 100)}% ready`}>
      <defs>
        <radialGradient id={`eggglow-${family}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity={glowing ? 0.9 : 0.25} />
          <stop offset="100%" stopColor={shell} stopOpacity="0" />
        </radialGradient>
      </defs>
      {glowing ? <ellipse cx="50" cy="66" rx="46" ry="54" fill={`url(#eggglow-${family})`} /> : null}
      <ellipse cx="50" cy="68" rx="34" ry="42" fill={shell} stroke="#00000022" strokeWidth="2" />
      <ellipse cx="42" cy="54" rx="9" ry="14" fill="#ffffff55" />
      {cracked ? (
        <path d="M30 62 L42 70 L34 80 L48 88 L40 100"
          fill="none" stroke="#4a3524" strokeWidth="3" strokeLinejoin="round" />
      ) : null}
      {hatching ? (
        <path d="M18 66 L34 60 L44 72 L56 58 L68 70 L82 62"
          fill="none" stroke="#4a3524" strokeWidth="3" strokeLinecap="round" />
      ) : null}
    </svg>
  )
}
