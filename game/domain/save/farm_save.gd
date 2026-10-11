## Everything that persists between visits — `save/farm-save.ts` and
## `save/empty.ts`. Plain data (a Dictionary), like the scheduler state inside
## it. Keys:
##   schema_version: int   SCHEMA_VERSION
##   scheduler             a SchedulerState dictionary
##   coins: int            earned from graded answers only, and only in the paddock and nest
##   feed: int             bought with coins in the feed shed; consumed by feeding
##   sessions: Array       session logs, oldest first
##   settings              {"muted": bool, "max_table": int}
##   animals: Array        the barn's animals and their care (Barn); added in v4
## A session log is {"started_at", "ended_at" (epoch ms), "context" (a
## SessionContext), "family" (int or null), "entries": Array}; an entry is
## {"fact_id", "given", "correct", "latency_ms", "outcome", "asked_at"}.
class_name FarmSave
extends RefCounted

## v4 adds the barn's animals; a v3 save (the TypeScript farm's shape) loads
## with the starting animals (FarmSaveCodec). Older saves are not migrated.
const SCHEMA_VERSION := 4


## A brand-new farm: no coins, enough feed for day one, the starting animals,
## nothing played yet.
## Refuses a table size outside MIN_TABLE..MAX_TABLE_DEFAULT.
static func empty(max_table: Variant = FactTuning.MAX_TABLE_DEFAULT) -> Result:
	var scheduler := SchedulerState.initial(max_table)
	if not scheduler.ok:
		return scheduler
	return Result.success({
		"schema_version": SCHEMA_VERSION,
		"scheduler": scheduler.value,
		"coins": 0,
		"feed": Coins.STARTING_FEED,
		"sessions": [],
		"settings": {"muted": false, "max_table": scheduler.value.max_table},
		"animals": Barn.starting_animals(),
	})


## A copy of `farm` with `changes` laid over it.
static func with_changes(farm: Dictionary, changes: Dictionary) -> Dictionary:
	var next := farm.duplicate()
	next.merge(changes, true)
	return next
