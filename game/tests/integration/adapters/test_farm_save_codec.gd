## @sf/persistence parse-farm-save.test.ts, against FarmSaveCodec. Saves go
## through real JSON text, so whole numbers arrive as floats, as from a file.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


func _fresh() -> Dictionary:
	return Fixtures.fresh_farm()


func _round_trip(farm: Dictionary) -> Variant:
	return FarmSaveCodec.decode(FarmSaveCodec.encode(farm))


## The fresh farm with `changes` over it, as JSON text and back to raw values.
func _raw(changes: Dictionary) -> Dictionary:
	return JSON.parse_string(FarmSaveCodec.encode(FarmSave.with_changes(_fresh(), changes)))


func _with_scheduler(changes: Dictionary) -> Dictionary:
	var raw := _raw({})
	raw.scheduler.merge(changes, true)
	return raw


func _with_fact(id: String, changes: Dictionary) -> Dictionary:
	var raw := _raw({})
	raw.scheduler.facts[id].merge(changes, true)
	return raw


func _without(raw: Dictionary, path: Array) -> Dictionary:
	var holder: Dictionary = raw
	for key: String in path.slice(0, -1):
		holder = holder[key]
	holder.erase(path[-1])
	return raw


func test_accepts_a_well_formed_v4_save() -> void:
	var farm := FarmSave.with_changes(_fresh(), {"coins": 3})
	assert_eq(_round_trip(farm), farm)


func test_accepts_a_save_with_a_populated_scheduler_and_session_log() -> void:
	var scheduler := {
		"facts": {"7x8": {
			"id": "7x8", "box": 2, "due_at": 14, "last_latency_ms": 2100.0, "recent_latencies": [2100.0],
			"correct_streak": 1, "total_attempts": 1, "total_correct": 1, "introduced": true,
		}},
		"global_counter": 12, "unlocked_tiers": [1, 2], "recent_families": [8, 3],
		"last_served": "7x8", "commute_credit": {"8x7": 0.5}, "max_table": 12,
	}
	var sessions := [{
		"started_at": 1000, "ended_at": 2000, "context": "paddock", "family": 8,
		"entries": [{"fact_id": "7x8", "given": 56.0, "correct": true, "latency_ms": 2100.0, "outcome": "SLOW", "asked_at": 11}],
	}]
	var farm := FarmSave.with_changes(_fresh(), {"scheduler": scheduler, "sessions": sessions})
	assert_eq(_round_trip(farm), farm)


func test_preserves_last_served_through_a_json_round_trip() -> void:
	var farm := FarmSave.with_changes(_fresh(), {"scheduler": SchedulerState.with_changes(_fresh().scheduler, {"last_served": "6x8"})})
	assert_eq(_round_trip(farm).scheduler.last_served, "6x8")


func test_drops_keys_that_are_not_part_of_the_schema() -> void:
	var raw := _raw({})
	raw["creatures"] = []
	raw["last_chores_date"] = null
	assert_eq(FarmSaveCodec.parse_farm_save(raw), _fresh())


func test_rejects_every_malformed_or_unplayable_blob() -> void:
	var cases := {
		"null": null,
		"a string": "save",
		"a number": 3,
		"an array": [],
		"an empty object": {},
		"a v2 blob": _raw({"schema_version": 2}),
		"a future schema": _raw({"schema_version": 5}),
		"a string schema_version": _raw({"schema_version": "4"}),
		"no scheduler": _without(_raw({}), ["scheduler"]),
		"a scheduler with facts as an array": _with_scheduler({"facts": []}),
		"a scheduler with a non-record fact": _with_scheduler({"facts": {"7x8": 5}}),
		"a fact status whose id is not its key": _with_fact("7x8", {"id": "8x7"}),
		"a fact status whose id is a number": _with_fact("7x8", {"id": 78}),
		"a fact status at box 2 but not introduced": _with_fact("7x8", {"box": 2, "introduced": false}),
		"a fact status with a negative last_latency_ms": _with_fact("1x1", {"last_latency_ms": -1}),
		"a fact status with six recent latencies": _with_fact("1x1", {"recent_latencies": [1, 1, 1, 1, 1, 1]}),
		"a fact status with a fractional due_at": _with_fact("1x1", {"due_at": 1.5}),
		"a commute credit of a whole box": _with_scheduler({"commute_credit": {"8x7": 1}}),
		"a fractional max_table": _with_scheduler({"max_table": 6.5}),
		"unlocked_tiers that is not an array": _with_scheduler({"unlocked_tiers": 1}),
		"fractional coins": _raw({"coins": 0.5}),
		"a scheduler with a string counter": _with_scheduler({"global_counter": "0"}),
		"a scheduler with non-numeric tiers": _with_scheduler({"unlocked_tiers": ["1"]}),
		"a scheduler missing recent_families": _without(_raw({}), ["scheduler", "recent_families"]),
		"a scheduler missing last_served": _without(_raw({}), ["scheduler", "last_served"]),
		"a scheduler with a numeric last_served": _with_scheduler({"last_served": 56}),
		"a scheduler with an object last_served": _with_scheduler({"last_served": {"id": "7x8"}}),
		"a scheduler missing commute_credit": _without(_raw({}), ["scheduler", "commute_credit"]),
		"a scheduler missing max_table": _without(_raw({}), ["scheduler", "max_table"]),
		"string coins": _raw({"coins": "0"}),
		"missing feed": _without(_raw({}), ["feed"]),
		"sessions as an object": _raw({"sessions": {}}),
		"a session without entries": _raw({"sessions": [{"started_at": 1, "ended_at": 2, "context": "free", "family": null}]}),
		"a session in an unknown context": _raw({"sessions": [{"started_at": 1, "ended_at": 2, "context": 3, "family": null, "entries": []}]}),
		"settings without muted": _raw({"settings": {"max_table": 12}}),
		"settings with a string max_table": _raw({"settings": {"muted": false, "max_table": "12"}}),
	}
	for label: String in cases:
		assert_null(FarmSaveCodec.parse_farm_save(cases[label]), label)


func test_whole_numbers_come_back_as_ints() -> void:
	var loaded: Dictionary = _round_trip(_fresh())
	assert_eq(typeof(loaded.coins), TYPE_INT)
	assert_eq(typeof(loaded.scheduler.max_table), TYPE_INT)
	assert_eq(typeof(loaded.scheduler.facts["1x1"].box), TYPE_INT)
	assert_eq(typeof(loaded.scheduler.unlocked_tiers[0]), TYPE_INT)


func test_text_that_is_not_json_decodes_to_null() -> void:
	assert_null(FarmSaveCodec.decode("{\"schema_version\": 3, \"coins\""))
	assert_null(FarmSaveCodec.decode(""))


# ─── the session clock (SF-111) ───

func test_the_session_clock_survives_a_round_trip_with_ints() -> void:
	var session := PlaySession.played(PlaySession.begin(1_728_640_000_000, 20_006), 1_728_640_180_000, 20_006)
	var loaded: Dictionary = _round_trip(FarmSave.with_changes(_fresh(), {"play_session": session}))
	assert_eq(loaded.play_session, session)
	for field: String in session:
		assert_eq(typeof(loaded.play_session[field]), TYPE_INT, field)


func test_a_save_without_a_session_clock_loads_with_none() -> void:
	var raw := _without(_raw({}), ["play_session"])
	var loaded: Variant = FarmSaveCodec.parse_farm_save(raw)
	assert_not_null(loaded)
	assert_null(loaded.play_session)


func test_a_malformed_session_clock_loads_as_none_and_keeps_the_farm() -> void:
	var good := PlaySession.begin(1000, 0)
	var cases := {
		"not a dictionary": "5 minutes",
		"a missing field": {"started_at": 1000, "last_played_at": 1000, "played_msec": 0},
		"negative play": FarmSave.with_changes(good, {"played_msec": -1}),
		"a fractional day": FarmSave.with_changes(good, {"day": 0.5}),
		"a string time": FarmSave.with_changes(good, {"last_played_at": "now"}),
	}
	for label: String in cases:
		var loaded: Variant = FarmSaveCodec.parse_farm_save(_raw({"coins": 9, "play_session": cases[label]}))
		assert_not_null(loaded, label)
		if loaded != null:
			assert_eq([loaded.coins, loaded.play_session], [9, null], label)
