// Creature contract. Implementation owned by Track D.
// Phase 0 ships STUBs for CreatureSVG, definitions, animations.

import type { ReactNode } from 'react'

/** The farm animal a family hatches into. */
export type AnimalKind =
  | 'chick'
  | 'duck'
  | 'rabbit'
  | 'sheep'
  | 'pig'
  | 'cat'
  | 'dog'
  | 'horse'
  | 'goat'
  | 'cow'
  | 'goose'
  | 'donkey'

export type CreatureParams = {
  animal: AnimalKind
  /** [body, belly/accent, ink] — warm, readable, high-contrast enough for eyes. */
  palette: [string, string, string]
  eyeStyle: 'big' | 'sleepy' | 'sparkly' | 'wide'
}

export type CreatureMood =
  | 'idle'
  | 'happy'
  | 'content' // resting smile (healthy)
  | 'sad' // resting droop (low health) — gentle, never distressed
  | 'eating'
  | 'puzzled'
  | 'sleeping'

export type CreatureHome = 'barn' | 'zoo'

export type HatchedCreature = {
  family: number
  name: string // player-assigned, defaults from DEFAULT_CREATURE_NAMES
  params: CreatureParams
  hatchedAt: number // epoch ms
  stallIndex: number
  /** where the animal lives — the barn, or the petting zoo by the pond */
  home?: CreatureHome
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
