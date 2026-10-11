## @sf/persistence parse-farm-save.adversarial.test.ts, against FarmSaveCodec.
## The localStorage-only cases (a __proto__ key, two stores over one storage
## key) have no GDScript counterpart; the two-stores case is covered for the
## file store in test_user_file_save_store.gd.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")

var _played: Dictionary


## A real, playable save a few questions in — what the game actually writes.
func before_all() -> void:
	var rng := SeededRng.new(3)
	var scheduler := Fixtures.fresh()
	for i in 25:
		var served := Fixtures.next_of(scheduler, rng)
		scheduler = Fixtures.grade(served.state, served.fact.id, served.fact.answer, 1200).state
	var session := {"started_at": 1, "ended_at": 2, "context": "paddock", "family": null, "entries": []}
	_played = FarmSave.with_changes(Fixtures.fresh_farm(), {"scheduler": scheduler, "coins": 7, "sessions": [session]})


func _raw(farm: Dictionary) -> Dictionary:
	return JSON.parse_string(FarmSaveCodec.encode(farm))


func _with_scheduler(changes: Dictionary) -> Dictionary:
	var raw := _raw(_played)
	raw.scheduler.merge(changes, true)
	return raw


func _with_facts(facts: Dictionary) -> Dictionary:
	var raw := _raw(_played)
	raw.scheduler.facts.merge(facts, true)
	return raw


## A facts map holding one well-formed but un-introduced tier-5 fact, and nothing else.
func _only_unintroduced_78() -> Dictionary:
	return {"7x8": FactState.fresh("7x8", false)}


func _status_78(changes: Dictionary) -> Dictionary:
	var status: Dictionary = _raw(_played).scheduler.facts["7x8"]
	status.merge(changes, true)
	return status


## Plays two questions on a parsed save — what the game does right after loading.
func _plays_once(farm: Dictionary) -> bool:
	var served := NextFact.pick(farm.scheduler, SeededRng.new(1))
	if not served.ok:
		return false
	var fact: Fact = served.value.fact
	var graded := Grading.grade_answer(served.value.state, Answer.new(fact.id, fact.answer, 900))
	if not graded.ok:
		return false
	var again := NextFact.pick(graded.value.state, SeededRng.new(2))
	return again.ok and Grading.grade_answer(again.value.state, Answer.new(again.value.fact.id, 0, 900)).ok


# ─── the structural guard against a corrupt blob ───

func test_a_truncated_blob_at_any_length_loads_as_null_or_a_farm_never_as_a_crash() -> void:
	var text := FarmSaveCodec.encode(_played)
	for length in range(0, text.length(), 97):
		var loaded: Variant = FarmSaveCodec.decode(text.left(length))
		assert_true(loaded == null or loaded is Dictionary, "cut at %d" % length)


func test_rejects_a_malformed_fact_status() -> void:
	var cases := {
		"an empty object as a fact status": {"7x8": {}},
		"a fact status with a string box": {"7x8": _status_78({"box": "5"})},
		"a fact status with box 9": {"7x8": _status_78({"box": 9})},
		"a fact status with recent_latencies as a string": {"7x8": _status_78({"recent_latencies": "fast"})},
		"a fact status introduced at box 0": {"7x8": _status_78({"box": 0, "introduced": true})},
		"deeply nested junk as a fact status": {"7x8": {"a": {"b": {"c": {"d": [1, {"e": null}]}}}}},
	}
	for label: String in cases:
		assert_null(FarmSaveCodec.parse_farm_save(_with_facts(cases[label])), label)


func test_rejects_a_scheduler_the_rules_can_never_produce() -> void:
	var cases := {
		"unlocked_tiers without tier 1": {"unlocked_tiers": []},
		"unlocked_tiers with a tier above 6": {"unlocked_tiers": [1, 2, 99]},
		"a max_table of 0": {"max_table": 0},
		"a max_table above the 12x12 table": {"max_table": 13},
		"a negative global_counter": {"global_counter": -1},
		"no facts at all for a 12-table": {"facts": {}},
		"a family outside the table in the history": {"recent_families": [13]},
	}
	for label: String in cases:
		assert_null(FarmSaveCodec.parse_farm_save(_with_scheduler(cases[label])), label)


func test_rejects_negative_coins_and_feed() -> void:
	assert_null(FarmSaveCodec.parse_farm_save(_raw(FarmSave.with_changes(_played, {"coins": -1}))))
	assert_null(FarmSaveCodec.parse_farm_save(_raw(FarmSave.with_changes(_played, {"feed": -1}))))


func test_rejects_a_save_whose_settings_max_table_disagrees_with_its_scheduler_max_table() -> void:
	var raw := _raw(FarmSave.with_changes(_played, {"settings": {"muted": false, "max_table": 5}}))
	assert_null(FarmSaveCodec.parse_farm_save(raw))


func test_rejects_a_save_with_nothing_to_serve() -> void:
	var locked := _with_scheduler({"facts": _only_unintroduced_78(), "unlocked_tiers": [1], "recent_families": []})
	var blocked := _with_scheduler({"facts": _only_unintroduced_78(), "unlocked_tiers": [1, 2, 3, 4, 5, 6], "recent_families": [8, 8]})
	assert_null(FarmSaveCodec.parse_farm_save(locked), "its only fact sits in a locked tier")
	assert_null(FarmSaveCodec.parse_farm_save(blocked), "its only fact is in the blocked family")


func test_any_save_it_accepts_can_be_played() -> void:
	var cases := {
		"an empty fact status": _with_scheduler({"facts": {"1x1": {}}, "max_table": 1}),
		"no facts at all": _with_scheduler({"facts": {}}),
		"a huge max_table with no facts for it": _with_scheduler({"max_table": 13}),
		"one un-introduced fact in a locked tier":
			_with_scheduler({"facts": _only_unintroduced_78(), "unlocked_tiers": [1], "recent_families": []}),
		"one un-introduced fact in the blocked family": _with_scheduler({"facts": _only_unintroduced_78(), "recent_families": [8, 8]}),
	}
	for label: String in cases:
		var parsed: Variant = FarmSaveCodec.parse_farm_save(cases[label])
		if parsed != null:
			assert_true(_plays_once(parsed), label)
		else:
			pass_test(label + ": refused")


func test_a_last_served_that_names_no_known_fact_is_harmless_for_both_mixed_and_egg_practice() -> void:
	var parsed: Variant = FarmSaveCodec.parse_farm_save(_with_scheduler({"last_served": "99x99"}))
	assert_not_null(parsed)
	assert_true(_plays_once(parsed))
	assert_true(NextFact.pick_in_family(parsed.scheduler, 3, SeededRng.new(1)).ok)


func test_huge_but_exact_counts_are_accepted_and_survive_a_round_trip() -> void:
	var farm := FarmSave.with_changes(_played, {"coins": FarmSaveCodec.MAX_COUNT})
	assert_eq(FarmSaveCodec.decode(FarmSaveCodec.encode(farm)).coins, FarmSaveCodec.MAX_COUNT)


func test_rejects_counts_a_json_number_cannot_hold_exactly() -> void:
	# TypeScript keeps 1e300 feed as a double; a GDScript int cannot hold it, so it is refused.
	for feed: float in [1e300, INF, NAN, float(FarmSaveCodec.MAX_COUNT) * 2.0]:
		var raw := _raw(_played)
		raw["feed"] = feed
		assert_null(FarmSaveCodec.parse_farm_save(raw), str(feed))


func test_the_fresh_farm_fixture_is_itself_a_playable_save() -> void:
	var parsed: Variant = FarmSaveCodec.parse_farm_save(_raw(Fixtures.fresh_farm()))
	assert_not_null(parsed)
	assert_true(_plays_once(parsed))


# ─── save → load → save ───

func test_a_real_played_save_survives_the_codec_byte_for_byte() -> void:
	var first_text := FarmSaveCodec.encode(_played)
	var reloaded: Variant = FarmSaveCodec.decode(first_text)
	assert_eq(reloaded, _played)
	assert_eq(FarmSaveCodec.encode(reloaded), first_text)


func test_a_reloaded_save_continues_identically_to_the_in_memory_original() -> void:
	var reloaded: Dictionary = FarmSaveCodec.decode(FarmSaveCodec.encode(_played))
	var a := Fixtures.next_of(_played.scheduler, SeededRng.new(9))
	var b := Fixtures.next_of(reloaded.scheduler, SeededRng.new(9))
	assert_eq(b.fact.id, a.fact.id)
	assert_eq(b.state, a.state)


func test_stray_keys_nested_inside_scheduler_settings_and_a_fact_status_are_dropped() -> void:
	var raw := _raw(_played)
	raw.scheduler["prototype_queue"] = [1, 2, 3]
	raw.scheduler.facts["1x1"]["creature"] = "hen"
	raw.settings["theme"] = "dark"
	var parsed: Dictionary = FarmSaveCodec.parse_farm_save(raw)
	assert_false(parsed.scheduler.has("prototype_queue"))
	assert_false(parsed.scheduler.facts["1x1"].has("creature"))
	assert_false(parsed.settings.has("theme"))
