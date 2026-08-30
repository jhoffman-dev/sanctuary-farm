// Creature contract. Implementation owned by Track D.
// Phase 0 ships STUBs for CreatureSVG, definitions, animations.

import type { ReactNode } from 'react'

/** The baby animal a family hatches into. */
export type AnimalKind =
  | 'chick'
  | 'duckling'
  | 'bunny'
  | 'lamb'
  | 'piglet'
  | 'kitten'
  | 'puppy'
  | 'foal'
  | 'fawn'
  | 'calf'
  | 'gosling'
  | 'kid'

export type CreatureParams = {
  animal: AnimalKind
  /** [body, belly/accent, ink] — warm, readable, high-contrast enough for eyes. */
  palette: [string, string, string]
  eyeStyle: 'big' | 'sleepy' | 'sparkly' | 'wide'
}

export type CreatureMood = 'idle' | 'happy' | 'eating' | 'puzzled' | 'sleeping'

export type HatchedCreature = {
  family: number
  name: string // player-assigned, defaults from DEFAULT_CREATURE_NAMES
  params: CreatureParams
  hatchedAt: number // epoch ms
  stallIndex: number
}

export type CreatureSVGProps = {
  params: CreatureParams
  mood: CreatureMood
  /** Rendered width/height in px; the drawing is square and scales to fit. */
  size: number
  className?: string
  title?: string
}

/** Deterministic params for a family, 1..12. Track D implements; Phase 0 stubs. */
export type DefaultCreatureParams = (family: number) => CreatureParams

/** The character the player walks around as (Track C renders, Track D may style). */
export type CharacterFacing = 'up' | 'down' | 'left' | 'right'

export type CreatureSlot = {
  creature: HatchedCreature | null // null = empty future stall
  choresOutstanding: boolean
  render: ReactNode // <CreatureSVG> instance or placeholder
}
