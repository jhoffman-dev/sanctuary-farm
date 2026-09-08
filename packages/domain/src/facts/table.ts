import type { Fact, FactId, Tier } from './fact'
import { MAX_TABLE_DEFAULT, factId, familyOf, isHardCore, tierOf } from './tuning'

/** Every ordered pair a×b with 1 ≤ a,b ≤ maxTable, in (a, b) order. 7×8 and 8×7 are distinct. */
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

const BY_ID: ReadonlyMap<FactId, Fact> = new Map(
  buildFacts(MAX_TABLE_DEFAULT).map((fact) => [fact.id, fact]),
)

/** Look up a fact of the full 12×12 table by id. */
export function getFact(id: FactId): Fact | undefined {
  return BY_ID.get(id)
}

export function factsInFamily(family: number, maxTable: number = MAX_TABLE_DEFAULT): Fact[] {
  return buildFacts(maxTable).filter((fact) => fact.family === family)
}

export function factsInTier(tier: Tier, maxTable: number = MAX_TABLE_DEFAULT): Fact[] {
  return buildFacts(maxTable).filter((fact) => fact.tier === tier)
}
