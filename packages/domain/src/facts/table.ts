import type { Fact, FactId, Tier } from './fact'
import { MAX_TABLE_DEFAULT, MIN_TABLE, factId, familyOf, isHardCore, tierOf } from './tuning'

/**
 * Throws unless maxTable is a whole table size the 12×12 fact table can grade.
 * Anything larger than MAX_TABLE_DEFAULT would create facts getFact() does not
 * know, and a non-integer or unbounded value would loop forever in buildFacts.
 */
export function assertTableSize(maxTable: number): void {
  if (!Number.isInteger(maxTable) || maxTable < MIN_TABLE || maxTable > MAX_TABLE_DEFAULT) {
    throw new RangeError(
      `maxTable must be an integer in ${MIN_TABLE}..${MAX_TABLE_DEFAULT}, got ${maxTable}`,
    )
  }
}

/**
 * Every ordered pair a×b with 1 ≤ a,b ≤ maxTable, in (a, b) order. 7×8 and 8×7 are
 * distinct. Every consumer of a table size funnels through here, so this is the
 * one place the size is validated.
 */
export function buildFacts(maxTable: number = MAX_TABLE_DEFAULT): Fact[] {
  assertTableSize(maxTable)
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
