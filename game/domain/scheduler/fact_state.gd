## The learning state of one fact. Plain data (a Dictionary) so it serialises
## as it stands and compares deeply with `==`; nothing changes one in place —
## every rule returns a new copy. Keys:
##   id: String              "7x8"
##   box: int                Leitner box; 0 = not yet introduced, 5 = mastery box
##   due_at: int             global_counter at which the fact is next due (not wall-clock)
##   last_latency_ms         float, or null before the first answer
##   recent_latencies: Array rolling floats, newest last, at most MAX_RECENT_LATENCIES
##   correct_streak: int, total_attempts: int, total_correct: int
##   introduced: bool        true exactly when box > 0
class_name FactState
extends RefCounted


static func fresh(id: String, introduced: bool) -> Dictionary:
	return {
		"id": id,
		"box": 1 if introduced else 0,
		"due_at": 0,
		"last_latency_ms": null,
		"recent_latencies": [],
		"correct_streak": 0,
		"total_attempts": 0,
		"total_correct": 0,
		"introduced": introduced,
	}


## A copy of `status` with `changes` laid over it.
static func patched(status: Dictionary, changes: Dictionary) -> Dictionary:
	var next := status.duplicate()
	next.merge(changes, true)
	return next
