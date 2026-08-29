import type { HatchedCreature } from '@/contracts'
import { DEFAULT_CREATURE_NAMES } from '@/contracts'
import { HAND_TUNED_CREATURE_PARAMS, defaultCreatureParams } from '@/creatures/definitions'

export function creatureParamsFor(family: number) {
  return HAND_TUNED_CREATURE_PARAMS[family] ?? defaultCreatureParams(family)
}

export function makeCreature(family: number, stallIndex: number, at = Date.now()): HatchedCreature {
  return {
    family,
    name: DEFAULT_CREATURE_NAMES[family] ?? `Creature ${family}`,
    params: creatureParamsFor(family),
    hatchedAt: at,
    stallIndex,
  }
}

export function nextFreeStall(creatures: HatchedCreature[]): number {
  const taken = new Set(creatures.map((c) => c.stallIndex))
  let i = 0
  while (taken.has(i)) i++
  return i
}
