## scheduler/family-practice.test.ts — NextFact.pick_in_family: egg practice
## can drive a family to mastery.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const Digest := preload("res://tests/support/oracle_digest.gd")
const FAMILY := 3

var _family_ids: Array[String]


func before_all() -> void:
	_family_ids = Fixtures.ids_of(FactTable.facts_in_family(FAMILY).value)


## One question of family practice: [served id, state after grading].
func _practise(state: Dictionary, latency_ms: int, correct: bool = true) -> Array:
	var served := Fixtures.next_in_family(state, FAMILY, SeededRng.new(1))
	var given := served.fact.answer if correct else served.fact.answer + 1
	return [served.fact.id, Fixtures.grade(served.state, served.fact.id, given, latency_ms).state]


func _family_in_play(state: Dictionary) -> Array[String]:
	return Fixtures.introduced_ids(state).filter(func(id: String) -> bool: return _family_ids.has(id))


func test_only_serves_facts_from_the_requested_family() -> void:
	var state := Fixtures.with_facts(Fixtures.fresh(), ["2x3", "3x2"], {"box": 1})
	for i in 30:
		var served := Fixtures.next_in_family(state, FAMILY, SeededRng.new(i))
		assert_eq(served.fact.family, FAMILY)
		state = Fixtures.grade(served.state, served.fact.id, served.fact.answer, 1200).state


func test_keeps_egg_rotation_facts_in_play_introducing_one_per_call_until_it_has_enough() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "1x3", {"box": 1})
	for i in range(1, FactTuning.EGG_ROTATION):
		state = Fixtures.next_in_family(state, FAMILY, SeededRng.new(1)).state
		assert_eq(_family_in_play(state).size(), i + 1)
	state = Fixtures.next_in_family(state, FAMILY, SeededRng.new(1)).state
	assert_eq(_family_in_play(state).size(), FactTuning.EGG_ROTATION)


func test_a_single_round_has_variety_several_distinct_facts_never_twice_in_a_row() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "1x3", {"box": 1})
	var played: Array[String] = []
	for q in 5:
		var step := _practise(state, 900)
		played.append(step[0])
		state = step[1]
	var distinct := {}
	for id in played:
		distinct[id] = true
	assert_gte(distinct.size(), 3)
	for i in range(1, played.size()):
		assert_ne(played[i], played[i - 1])


func test_does_not_repeat_a_fact_just_answered_wrong_even_though_it_is_the_neediest() -> void:
	var state := Fixtures.with_facts(Fixtures.fresh(), _family_ids, {"box": 3, "due_at": 0})
	var first := _practise(state, 900, false)
	assert_eq(first[1].facts[first[0]].box, 1)
	var second := _practise(first[1], 900)
	assert_ne(second[0], first[0])


func test_ranks_by_box_then_overdue_then_the_slowest_rolling_latency() -> void:
	var rotation := ["1x3", "2x3", "3x1", "3x2"]
	var latencies := {"1x3": 1000, "2x3": 4000, "3x1": 2000, "3x2": 3000}
	var slowest_2x3 := Fixtures.with_facts(Fixtures.fresh(), rotation, {"box": 2, "due_at": 0})
	for id: String in rotation:
		slowest_2x3 = Fixtures.with_fact(slowest_2x3, id, {"recent_latencies": [latencies[id]]})
	assert_eq(Fixtures.next_in_family(slowest_2x3, FAMILY, SeededRng.new(1)).fact.id, "2x3")

	var slowest_3x2 := Fixtures.with_fact(slowest_2x3, "3x2", {"recent_latencies": [9000]})
	assert_eq(Fixtures.next_in_family(slowest_3x2, FAMILY, SeededRng.new(1)).fact.id, "3x2")

	var lower_box_wins := Fixtures.with_fact(slowest_3x2, "1x3", {"box": 1})
	assert_eq(Fixtures.next_in_family(lower_box_wins, FAMILY, SeededRng.new(1)).fact.id, "1x3")

	var more_overdue_wins := Fixtures.with_fact(slowest_3x2, "1x3", {"due_at": -50})
	assert_eq(Fixtures.next_in_family(more_overdue_wins, FAMILY, SeededRng.new(1)).fact.id, "1x3")


func test_introduces_the_rest_of_the_family_once_the_known_ones_are_mastered_then_hatches() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "1x3", {"box": 1})
	var hatched_at := -1
	for i in 400:
		var served := Fixtures.next_in_family(state, FAMILY, SeededRng.new(7))
		var graded := Fixtures.grade(served.state, served.fact.id, served.fact.answer, 900)
		state = graded.state
		if graded.result.family_just_mastered == FAMILY:
			hatched_at = i
			break
	assert_gte(hatched_at, 0)
	assert_eq(hatched_at, int(Digest.oracles().hatchStep), "hatches on the same answer as TypeScript")
	assert_true(Mastery.is_family_mastered(state, FAMILY))
	for id in _family_ids:
		assert_true(state.facts[id].introduced, id)
	assert_eq(Mastery.family_progress(state, FAMILY), 1.0)


func test_keeps_serving_a_fully_mastered_family_rather_than_stalling() -> void:
	var state := Fixtures.with_facts(Fixtures.fresh(), _family_ids, {"box": 5, "recent_latencies": [900, 900, 900]})
	assert_eq(Fixtures.next_in_family(state, FAMILY, SeededRng.new(1)).fact.family, FAMILY)


func test_falls_back_to_mixed_practice_for_a_family_with_no_facts_in_range() -> void:
	assert_ne(Fixtures.next_in_family(Fixtures.fresh(4), 9, SeededRng.new(1)).fact.family, 9)
