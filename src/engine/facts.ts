// Phase 0 reference implementation. Track A OWNS this file and may refine it,
// but the fact table is shared infrastructure — keep buildFacts/ALL_FACTS stable.

import { factId, familyOf, isHardCore, tierOf, MAX_TABLE_DEFAULT } from '@/contracts'
import type { Fact } from '@/contracts'

/** Every ordered pair a×b with 1 ≤ a,b ≤ maxTable. 7×8 and 8×7 are distinct facts. */
export function buildFacts(maxTable: number = MAX_TABLE_DEFAULT): Fact[] {
  const out: Fact[] = []
  for (let a = 1; a <= maxTable; a++) {
    for (let b = 1; b <= maxTable; b++) {
      const id = factId(a, b)
      out.push({
        id,
        a,
        b,
        answer: a * b,
        family: familyOf(a, b),
        tier: tierOf(a, b),
        hardCore: isHardCore(id),
      })
    }
  }
  return out
}

export const ALL_FACTS: Fact[] = buildFacts(MAX_TABLE_DEFAULT)

const BY_ID = new Map(ALL_FACTS.map((f) => [f.id, f]))
export function getFact(id: string): Fact | undefined {
  return BY_ID.get(id)
}

export function factsInFamily(family: number, maxTable = MAX_TABLE_DEFAULT): Fact[] {
  return buildFacts(maxTable).filter((f) => f.family === family)
}

export function factsInTier(tier: number, maxTable = MAX_TABLE_DEFAULT): Fact[] {
  return buildFacts(maxTable).filter((f) => f.tier === tier)
}
