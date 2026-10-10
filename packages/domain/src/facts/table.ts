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

/** One table size's facts grouped by family and by tier; every array and fact is frozen. */
type Membership = {
  readonly byFamily: ReadonlyMap<number, readonly Fact[]>
  readonly byTier: ReadonlyMap<Tier, readonly Fact[]>
}

const NO_FACTS: readonly Fact[] = Object.freeze([])

function groupFacts<K>(facts: readonly Fact[], keyOf: (fact: Fact) => K): ReadonlyMap<K, readonly Fact[]> {
  const groups = new Map<K, Fact[]>()
  for (const fact of facts) {
    const group = groups.get(keyOf(fact))
    if (group) group.push(fact)
    else groups.set(keyOf(fact), [fact])
  }
  return new Map([...groups].map(([key, group]) => [key, Object.freeze(group)]))
}

function indexTable(maxTable: number): Membership {
  const facts = buildFacts(maxTable).map((fact) => Object.freeze(fact))
  return {
    byFamily: groupFacts(facts, (fact) => fact.family),
    byTier: groupFacts(facts, (fact) => fact.tier),
  }
}

/**
 * Family and tier membership for every valid table size, built once at load (12 sizes, 650 facts)
 * instead of rebuilding the table on every scheduler step (SF-88). Safe as module state in the
 * domain: it is a pure function of the table size, never written after load, and everything it
 * hands out is frozen, so no caller can observe or change it.
 */
const MEMBERSHIP: ReadonlyMap<number, Membership> = new Map(
  Array.from({ length: MAX_TABLE_DEFAULT - MIN_TABLE + 1 }, (_, i) => MIN_TABLE + i).map((size) => [
    size,
    indexTable(size),
  ]),
)

function membershipOf(maxTable: number): Membership {
  // Every valid size is indexed at load, so a miss is an invalid size and buildFacts throws its RangeError.
  return MEMBERSHIP.get(maxTable) ?? indexTable(maxTable)
}

/** The facts whose larger operand is `family`, in (a, b) order. Frozen and shared between calls. */
export function factsInFamily(family: number, maxTable: number = MAX_TABLE_DEFAULT): readonly Fact[] {
  return membershipOf(maxTable).byFamily.get(family) ?? NO_FACTS
}

/** The facts of `tier`, in (a, b) order. Frozen and shared between calls. */
export function factsInTier(tier: Tier, maxTable: number = MAX_TABLE_DEFAULT): readonly Fact[] {
  return membershipOf(maxTable).byTier.get(tier) ?? NO_FACTS
}
