// STUB — Track C replaces with the round-headed 4-facing figure + bob/squash.
import type { CharacterFacing } from '@/contracts'
import { TILE_PX } from '@/contracts'

export type CharacterProps = {
  facing: CharacterFacing
  moving: boolean
}

export function Character({ facing }: CharacterProps) {
  return (
    <svg data-stub="Character" width={TILE_PX} height={TILE_PX} viewBox="0 0 48 48">
      <circle cx="24" cy="20" r="12" fill="#f4a259" />
      <rect x="16" y="28" width="16" height="14" rx="6" fill="#5b8e7d" />
      <title>{facing}</title>
    </svg>
  )
}
