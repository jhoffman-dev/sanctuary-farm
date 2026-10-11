## A round in progress. Never edited in place: the round rules return a copy.
class_name ActiveRound
extends RefCounted

var plan: RoundPlan
var started_at: int
var in_flight: InFlight
## Session-log entries for the answers graded so far.
var entries: Array[Dictionary] = []
## The care this round is played for (FarmGame.start_care), or null.
var care: CareOrder = null


func _init(round_plan: RoundPlan, started_at_msec: int) -> void:
	plan = round_plan
	started_at = started_at_msec


## A copy with a different question in flight (or none) and the given entries.
func with_turn(next_in_flight: InFlight, next_entries: Array[Dictionary]) -> ActiveRound:
	var copy := ActiveRound.new(plan, started_at)
	copy.in_flight = next_in_flight
	copy.entries = next_entries
	copy.care = care
	return copy
