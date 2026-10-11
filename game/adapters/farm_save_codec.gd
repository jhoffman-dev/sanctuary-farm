## Text <-> FarmSave for the save file — `@sf/persistence`'s parseFarmSave,
## field by field. Parse, don't trust: anything that is not a well-formed v4
## (or v3, see below) save the rules can actually play decodes to null (a fresh farm), never to a
## half-read value and never to a crash. Every dictionary is rebuilt from
## checked values, so stray keys never reach the rules, and whole numbers come
## back as ints (JSON hands every number over as a float).
class_name FarmSaveCodec
extends RefCounted

const SCHEMA_VERSION := FarmSave.SCHEMA_VERSION
## v3 predates the barn: it loads with the starting animals and is written back as v4.
const BEFORE_ANIMALS_VERSION := 3
## The largest whole number a JSON float holds exactly (2^53 - 1); a count
## beyond it could not round-trip.
const MAX_COUNT := 9007199254740991


## Keys stay in insertion order and floats at full precision, so the same
## farm always encodes to the same text.
static func encode(farm: Dictionary) -> String:
	return JSON.stringify(farm, "", false, true)


static func decode(text: String) -> Variant:
	var json := JSON.new()
	if json.parse(text) != OK:
		return null
	return parse_farm_save(json.data)


## The FarmSave in `raw`, or null when it is not one the game could have written.
static func parse_farm_save(raw: Variant) -> Variant:
	if not raw is Dictionary:
		return null
	var version := _count(raw.get("schema_version"))
	if version != SCHEMA_VERSION and version != BEFORE_ANIMALS_VERSION:
		return null
	var scheduler: Variant = _scheduler(raw.get("scheduler"))
	if scheduler == null:
		return null
	var settings: Variant = _settings(raw.get("settings"), scheduler.max_table)
	var sessions: Variant = _sessions(raw.get("sessions"))
	var coins := _count(raw.get("coins"))
	var feed := _count(raw.get("feed"))
	var animals: Variant = _animals(raw, version)
	if settings == null or sessions == null or coins < 0 or feed < 0 or animals == null:
		return null
	return {
		"schema_version": SCHEMA_VERSION,
		"scheduler": scheduler,
		"coins": coins,
		"feed": feed,
		"sessions": sessions,
		"settings": settings,
		"animals": animals,
	}


static func _animals(raw: Dictionary, version: int) -> Variant:
	if version == BEFORE_ANIMALS_VERSION:
		return Barn.starting_animals()
	return AnimalsCodec.parse(raw.get("animals"))


static func _scheduler(value: Variant) -> Variant:
	if not value is Dictionary:
		return null
	var facts: Variant = _facts(value.get("facts"))
	var credit: Variant = _commute_credit(value.get("commute_credit"))
	var max_table := _table(value.get("max_table"))
	var counter := _count(value.get("global_counter"))
	var tiers: Variant = _unlocked_tiers(value.get("unlocked_tiers"))
	var families: Variant = _family_history(value.get("recent_families"))
	if facts == null or credit == null or max_table < 0 or counter < 0 or tiers == null or families == null:
		return null
	# An unknown last_served is harmless: it only ever stops a fact being asked twice in a row.
	var last_served: Variant = value.get("last_served", false)
	if last_served != null and not last_served is String:
		return null
	var scheduler := {
		"facts": facts, "global_counter": counter, "unlocked_tiers": tiers, "recent_families": families,
		"last_served": last_served, "commute_credit": credit, "max_table": max_table,
	}
	# Structurally sound is not enough: a state the scheduler cannot serve a
	# first question from would be refused the moment a round started.
	return scheduler if Playable.has_playable_fact(scheduler) else null


## Whether the map is playable is the scheduler's judgement, made in _scheduler.
static func _facts(value: Variant) -> Variant:
	if not value is Dictionary:
		return null
	var facts := {}
	for key: Variant in value:
		var status: Variant = _fact_state(key, value[key])
		if status == null:
			return null
		facts[key] = status
	return facts


static func _fact_state(key: Variant, value: Variant) -> Variant:
	if not value is Dictionary or not key is String or not value.get("id") is String or value.id != key:
		return null
	var box := _count(value.get("box"))
	var introduced: Variant = value.get("introduced")
	# Box 0 means exactly "not yet introduced"; the two fields must agree.
	if box < 0 or box > FactTuning.MASTERY_BOX or not introduced is bool or introduced == (box == 0):
		return null
	var counts := {}
	for field in ["due_at", "correct_streak", "total_attempts", "total_correct"]:
		counts[field] = _count(value.get(field))
		if counts[field] < 0:
			return null
	var last: Variant = value.get("last_latency_ms", false)
	var recent: Variant = value.get("recent_latencies")
	if (last != null and not _is_duration(last)) or not _is_latency_window(recent):
		return null
	# Built in FactState's key order, so a reloaded farm encodes to the same text.
	return {
		"id": key, "box": box, "due_at": counts.due_at, "last_latency_ms": _float_or_null(last),
		"recent_latencies": _floats(recent), "correct_streak": counts.correct_streak,
		"total_attempts": counts.total_attempts, "total_correct": counts.total_correct, "introduced": introduced,
	}


static func _commute_credit(value: Variant) -> Variant:
	if not value is Dictionary:
		return null
	var credit := {}
	for key: Variant in value:
		# A whole box of credit is promoted on the spot, so what is owed is always a fraction.
		if not key is String or not _is_duration(value[key]) or value[key] >= 1.0:
			return null
		credit[key] = float(value[key])
	return credit


## Tier 1 is never locked, so a well-formed list always contains it.
static func _unlocked_tiers(value: Variant) -> Variant:
	var tiers: Variant = _whole_numbers(value)
	if tiers == null or not tiers.has(1):
		return null
	for tier: int in tiers:
		if not FactTuning.TIER_NAMES.has(tier):
			return null
	return tiers


static func _family_history(value: Variant) -> Variant:
	var families: Variant = _whole_numbers(value)
	if families == null:
		return null
	for family: int in families:
		if not FactTable.check_size(family).ok:
			return null
	return families


static func _sessions(value: Variant) -> Variant:
	if not value is Array:
		return null
	var sessions := []
	for item: Variant in value:
		var session: Variant = _session_log(item)
		if session == null:
			return null
		sessions.append(session)
	return sessions


## Entries are informational and never fed back into the rules, so their shape
## is not re-checked; only asked_at is restored to an int.
static func _session_log(value: Variant) -> Variant:
	if not value is Dictionary:
		return null
	var started: Variant = value.get("started_at")
	var ended: Variant = value.get("ended_at")
	var family: Variant = value.get("family", false)
	var context: Variant = value.get("context")
	if not _is_number(started) or not _is_number(ended) or not context is String or not SessionContext.ALL.has(context):
		return null
	if (family != null and not _is_number(family)) or not value.get("entries") is Array:
		return null
	var entries := []
	for entry: Variant in value.entries:
		entries.append(_entry(entry))
	return {
		"started_at": _int_if_whole(started), "ended_at": _int_if_whole(ended), "context": context,
		"family": _int_if_whole(family) if family != null else null, "entries": entries,
	}


static func _entry(entry: Variant) -> Variant:
	if not entry is Dictionary or not entry.has("asked_at"):
		return entry
	var restored: Dictionary = entry.duplicate()
	restored["asked_at"] = _int_if_whole(entry.asked_at)
	return restored


static func _settings(value: Variant, max_table: int) -> Variant:
	if not value is Dictionary or not value.get("muted") is bool:
		return null
	# The scheduler's table is the one in play; a disagreeing setting would list families it cannot serve.
	if not _is_number(value.get("max_table")) or value.max_table != max_table:
		return null
	return {"muted": value.muted, "max_table": max_table}


## A whole number in 0..MAX_COUNT, or -1. A string or bool must not reach `==`
## against an int (GDScript errors on it), so the type is checked first.
static func _count(value: Variant) -> int:
	var whole: Variant = FactTuning.whole_number(value)
	if whole == null or whole < 0 or whole > MAX_COUNT:
		return -1
	return whole


static func _table(value: Variant) -> int:
	var size := _count(value)
	return size if FactTable.check_size(size).ok else -1


static func _whole_numbers(value: Variant) -> Variant:
	if not value is Array:
		return null
	var numbers := []
	for item: Variant in value:
		var whole: Variant = FactTuning.whole_number(item)
		if whole == null:
			return null
		numbers.append(whole)
	return numbers


static func _is_number(value: Variant) -> bool:
	return typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT


static func _is_duration(value: Variant) -> bool:
	return _is_number(value) and is_finite(value) and value >= 0


static func _is_latency_window(value: Variant) -> bool:
	if not value is Array or value.size() > FactTuning.MAX_RECENT_LATENCIES:
		return false
	return value.all(_is_duration)


static func _floats(values: Array) -> Array:
	return values.map(func(ms: Variant) -> float: return float(ms))


static func _float_or_null(value: Variant) -> Variant:
	return float(value) if value != null else null


static func _int_if_whole(value: Variant) -> Variant:
	var whole: Variant = FactTuning.whole_number(value)
	return whole if whole != null else value
