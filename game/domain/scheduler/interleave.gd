## Never the same family three times in a row (game rule 5) — `scheduler/interleave.ts`.
class_name Interleave
extends RefCounted

## Enough history to detect a run of INTERLEAVE_MAX_CONSECUTIVE with room to spare.
const RECENT_FAMILIES_KEEP := 4


## The family that would make one-too-many in a row, or FactTuning.NO_FAMILY.
static func blocked_family(state: Dictionary) -> int:
	var recent: Array = state.recent_families
	if recent.size() < FactTuning.INTERLEAVE_MAX_CONSECUTIVE:
		return FactTuning.NO_FAMILY
	var run := recent.slice(-FactTuning.INTERLEAVE_MAX_CONSECUTIVE)
	for family: Variant in run:
		if family != run[0]:
			return FactTuning.NO_FAMILY
	return run[0]


## Drop candidates of the blocked family. If that would leave nothing, relax and
## return the input unchanged — a single-family board cannot interleave. Only
## apply this to a pool that spans every family in play; a subset (one tier,
## the due list) can be single-family while the board is not.
static func avoiding_family(cards: Array[Card], blocked: int) -> Array[Card]:
	if blocked == FactTuning.NO_FAMILY:
		return cards
	var kept := cards.filter(func(card: Card) -> bool: return card.fact.family != blocked)
	return kept if not kept.is_empty() else cards


## Record the served fact in the interleave history and hand it out.
static func serve(state: Dictionary, fact: Fact) -> Served:
	var recent: Array = state.recent_families.duplicate()
	recent.append(fact.family)
	var changes := {"recent_families": recent.slice(-RECENT_FAMILIES_KEEP), "last_served": fact.id}
	return Served.new(fact, SchedulerState.with_changes(state, changes))
