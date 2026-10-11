## The whole learning state — plain data persisted inside the farm save. Every
## scheduler rule takes a state and returns a new one; none edits it in place.
## Keys:
##   facts: Dictionary          fact id -> FactState
##   global_counter: int        questions graded so far; the unit of Leitner time
##   unlocked_tiers: Array      tiers whose facts may be introduced; always holds 1
##   recent_families: Array     families of the latest served facts, newest last
##   last_served                id of the fact served last, or null
##   commute_credit: Dictionary fact id -> owed fraction of a box, in [0, 1)
##   max_table: int             highest table in play; facts above it are inert
class_name SchedulerState
extends RefCounted


## Fresh state: every in-range fact created, only the Anchors tier unlocked, and
## the cold-start families introduced at box 1 and due now. Refuses a table size
## outside MIN_TABLE..MAX_TABLE_DEFAULT.
static func initial(max_table: Variant = FactTuning.MAX_TABLE_DEFAULT) -> Result:
	var size := FactTable.check_size(max_table)
	if not size.ok:
		return size
	var facts := {}
	for fact in FactTable.table_of(size.value):
		facts[fact.id] = FactState.fresh(fact.id, FactTuning.COLD_START_FAMILIES.has(fact.family))
	return Result.success({
		"facts": facts,
		"global_counter": 0,
		"unlocked_tiers": [1],
		"recent_families": [],
		"last_served": null,
		"commute_credit": {},
		"max_table": size.value,
	})


## A copy of `state` with one fact's status replaced.
static func with_status(state: Dictionary, status: Dictionary) -> Dictionary:
	var facts: Dictionary = state.facts.duplicate()
	facts[status.id] = status
	return with_changes(state, {"facts": facts})


## A copy of `state` with `changes` laid over it.
static func with_changes(state: Dictionary, changes: Dictionary) -> Dictionary:
	var next := state.duplicate()
	next.merge(changes, true)
	return next
