## Mastery and family progress — `scheduler/progress.ts`.
class_name Mastery
extends RefCounted

## Progress can show "almost" but never 1.0 until the family is truly mastered.
const UNMASTERED_PROGRESS_CAP := 0.98
const _PROGRESS_BOX := 3


## Mastered = at the mastery box with the last few answers all fluent. A
## missing status (null) is not mastered.
static func is_fact_mastered(status: Variant) -> bool:
	if status == null or status.box != FactTuning.MASTERY_BOX:
		return false
	var recent: Array = status.recent_latencies.slice(-FactTuning.MASTERY_RECENT_FLUENT_COUNT)
	if recent.size() < FactTuning.MASTERY_RECENT_FLUENT_COUNT:
		return false
	for ms: Variant in recent:
		if float(ms) >= FactTuning.FLUENT_MAX_MS:
			return false
	return true


## A family with no facts in range (or no such family) is never mastered.
static func is_family_mastered(state: Dictionary, family: Variant) -> bool:
	var facts := _family_facts(state, family)
	if facts.is_empty():
		return false
	for fact in facts:
		if not is_fact_mastered(state.facts.get(fact.id)):
			return false
	return true


## Share of the family at box 3+, capped below 1.0 until every fact is mastered.
static func family_progress(state: Dictionary, family: Variant) -> float:
	var facts := _family_facts(state, family)
	if facts.is_empty():
		return 0.0
	if is_family_mastered(state, family):
		return 1.0
	var at_progress_box := 0
	for fact in facts:
		var status: Variant = state.facts.get(fact.id)
		if status != null and status.box >= _PROGRESS_BOX:
			at_progress_box += 1
	return minf(float(at_progress_box) / facts.size(), UNMASTERED_PROGRESS_CAP)


static func _family_facts(state: Dictionary, family: Variant) -> Array[Fact]:
	var members := FactTable.facts_in_family(family, state.max_table)
	return members.value if members.ok else ([] as Array[Fact])
