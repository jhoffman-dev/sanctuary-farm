## What the goodnight summary counts for one local day, read from the round
## logs the save already keeps (FarmSave `sessions`) — the prototype's day
## summary (`SummaryScreen.tsx`): answered, correct, fluent. Plus the facts
## that got faster: answered correctly today faster than on any earlier day.
## Nothing here is a score to beat; it is what went well.
class_name DayTally
extends RefCounted

var answered := 0
var correct := 0
var fluent := 0
## Fact ids, in the order first answered correctly today.
var faster_facts: Array[String] = []


## The tally for `day` (a CareDay) across `round_logs`. A round counts on the
## day it started, at the player's offset from UTC — as the prototype did; an
## entry's `asked_at` is the scheduler's question counter, not a time.
static func of(round_logs: Array, day: int, utc_offset_minutes: int) -> DayTally:
	var tally := DayTally.new()
	var best_today := {}
	var best_before := {}
	for round_log: Dictionary in round_logs:
		var round_day := CareDay.of(int(round_log.started_at), utc_offset_minutes)
		for entry: Variant in round_log.entries:
			if not _is_readable(entry):
				continue
			if round_day == day:
				tally._count(entry)
				_keep_best(best_today, entry)
			elif round_day < day:
				_keep_best(best_before, entry)
	for fact_id: String in best_today:
		if best_before.has(fact_id) and best_today[fact_id] < best_before[fact_id]:
			tally.faster_facts.append(fact_id)
	return tally


func _count(entry: Dictionary) -> void:
	answered += 1
	if entry.correct:
		correct += 1
	if typeof(entry.get("outcome")) == TYPE_STRING and entry.outcome == Outcome.FLUENT:
		fluent += 1


## The save keeps log entries unchecked (FarmSaveCodec), since no rule plays
## from them; one this tally cannot read is left out rather than trusted.
static func _is_readable(entry: Variant) -> bool:
	if not entry is Dictionary or not entry.get("fact_id") is String or not entry.get("correct") is bool:
		return false
	var latency: Variant = entry.get("latency_ms")
	return (latency is int or latency is float) and is_finite(float(latency))


## Only a correct answer's latency says anything about speed.
static func _keep_best(best: Dictionary, entry: Dictionary) -> void:
	if not entry.correct:
		return
	var latency := float(entry.latency_ms)
	if not best.has(entry.fact_id) or latency < best[entry.fact_id]:
		best[entry.fact_id] = latency
