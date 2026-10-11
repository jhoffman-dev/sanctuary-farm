## scheduler/grade.test.ts — latency is the primary promotion signal.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


func _answer_of(fact_id: String) -> int:
	return FactTable.get_fact(fact_id).answer


func _fluent(state: Dictionary, fact_id: String, given: Variant = null) -> Graded:
	return Fixtures.grade(state, fact_id, given if given != null else _answer_of(fact_id), 1000)


func _both_at_box_1() -> Dictionary:
	return Fixtures.with_fact(Fixtures.with_fact(Fixtures.fresh(), "7x8", {"box": 1}), "8x7", {"box": 1})


func test_a_correct_but_slow_5000_ms_answer_holds_the_box() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "5x6", {"box": 4})
	var graded := Fixtures.grade(state, "5x6", 30, 5000)
	assert_eq(graded.result.outcome, Outcome.SLOW)
	assert_true(graded.result.correct)
	assert_eq(graded.result.previous_box, 4)
	assert_eq(graded.result.new_box, 4)
	assert_eq(graded.state.facts["5x6"].box, 4)


func test_a_slow_answer_re_queues_at_the_smaller_of_its_box_interval_and_box_1() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "5x6", {"box": 4, "due_at": 0})
	var after := Fixtures.grade(state, "5x6", 30, 4000).state
	assert_eq(after.facts["5x6"].due_at, after.global_counter + FactTuning.LEITNER_INTERVALS[1])


func test_a_fluent_answer_promotes_one_box_and_re_queues_at_the_new_box_interval() -> void:
	for box in [1, 2, 3, 4]:
		var graded := _fluent(Fixtures.with_fact(Fixtures.fresh(), "6x7", {"box": box}), "6x7")
		assert_eq(graded.result.outcome, Outcome.FLUENT)
		assert_eq(graded.result.new_box, box + 1)
		var after := graded.state
		assert_eq(after.facts["6x7"].due_at, after.global_counter + FactTuning.LEITNER_INTERVALS[box + 1])


func test_a_fluent_answer_at_the_mastery_box_stays_there() -> void:
	var graded := _fluent(Fixtures.with_fact(Fixtures.fresh(), "6x7", {"box": FactTuning.MASTERY_BOX}), "6x7")
	assert_eq(graded.result.new_box, FactTuning.MASTERY_BOX)
	var interval: int = FactTuning.LEITNER_INTERVALS[FactTuning.MASTERY_BOX]
	assert_eq(graded.state.facts["6x7"].due_at, graded.state.global_counter + interval)


func test_a_labored_answer_demotes_one_box() -> void:
	var graded := Fixtures.grade(Fixtures.with_fact(Fixtures.fresh(), "6x7", {"box": 3}), "6x7", 42, 9000)
	assert_eq(graded.result.outcome, Outcome.LABORED)
	assert_eq(graded.result.new_box, 2)
	assert_eq(graded.state.facts["6x7"].box, 2)
	assert_eq(graded.state.facts["6x7"].due_at, graded.state.global_counter + FactTuning.LEITNER_INTERVALS[2])


func test_a_labored_answer_on_a_box_1_fact_leaves_it_at_box_1() -> void:
	var graded := Fixtures.grade(Fixtures.with_fact(Fixtures.fresh(), "6x7", {"box": 1}), "6x7", 42, 12000)
	assert_eq(graded.result.outcome, Outcome.LABORED)
	assert_eq(graded.result.new_box, 1)


func test_a_wrong_answer_resets_to_box_1_regardless_of_prior_box() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "8x9", {"box": 5, "recent_latencies": [900, 900, 900]})
	var graded := Fixtures.grade(state, "8x9", 71, 500)
	assert_eq(graded.result.outcome, Outcome.WRONG)
	assert_false(graded.result.correct)
	assert_eq(graded.result.correct_answer, 72)
	assert_eq(graded.result.new_box, 1)
	assert_eq(graded.state.facts["8x9"].box, 1)
	assert_eq(graded.state.facts["8x9"].correct_streak, 0)


func test_advances_the_global_counter_by_exactly_1_and_records_the_attempt() -> void:
	var state := Fixtures.fresh()
	var after := _fluent(state, "1x2").state
	var status: Dictionary = after.facts["1x2"]
	assert_eq(after.global_counter, state.global_counter + 1)
	assert_eq(status.total_attempts, 1)
	assert_eq(status.total_correct, 1)
	assert_eq(status.correct_streak, 1)
	assert_eq(status.last_latency_ms, 1000.0)
	assert_eq(status.recent_latencies, [1000.0])


func test_keeps_only_the_most_recent_latencies() -> void:
	var state := Fixtures.fresh()
	for i in 7:
		state = Fixtures.grade(state, "1x2", 2, 1000 + i).state
	assert_eq(state.facts["1x2"].recent_latencies, [1002.0, 1003.0, 1004.0, 1005.0, 1006.0])


func test_refuses_a_latency_that_is_not_a_finite_non_negative_duration_before_touching_the_state() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "7x8", {"box": 3})
	for latency_ms: float in [NAN, INF, -INF, -1.0]:
		var refused := Grading.grade_answer(state, Answer.new("7x8", 56, latency_ms))
		assert_false(refused.ok, str(latency_ms))
		assert_string_contains(refused.error, "latency")
	assert_eq(Fixtures.grade(state, "7x8", 56, 0).result.outcome, Outcome.FLUENT)


func test_refuses_to_grade_a_fact_that_was_never_introduced() -> void:
	var state := Fixtures.fresh()
	assert_false(state.facts["7x8"].introduced)
	var refused := Grading.grade_answer(state, Answer.new("7x8", 56, 900))
	assert_false(refused.ok)
	assert_string_contains(refused.error, 'fact "7x8" was never introduced')


func test_throws_for_a_fact_the_state_does_not_know() -> void:
	assert_string_contains(Grading.grade_answer(Fixtures.fresh(), Answer.new("13x13", 1, 1)).error, "unknown fact")
	assert_string_contains(Grading.grade_answer(Fixtures.fresh(4), Answer.new("7x8", 56, 1)).error, "unknown fact")


# ─── commutativity — the twin is half-promoted, never demoted ───

func test_two_correct_answers_on_7x8_move_8x7_up_one_box() -> void:
	var state := _fluent(_both_at_box_1(), "7x8").state
	assert_eq(state.facts["8x7"].box, 1)
	assert_eq(state.commute_credit["8x7"], 0.5)
	state = _fluent(state, "7x8").state
	assert_eq(state.facts["8x7"].box, 2)
	assert_eq(state.commute_credit["8x7"], 0.0)
	assert_eq(state.facts["8x7"].due_at, state.global_counter + FactTuning.LEITNER_INTERVALS[2])


func test_across_a_mixed_run_the_twins_box_never_decreases_and_reaches_mastery() -> void:
	var state := _fluent(_fluent(_both_at_box_1(), "7x8").state, "7x8").state
	var boxes: Array[int] = []
	for i in 30:
		state = _fluent(state, "7x8", 0 if i % 4 == 0 else 56).state
		boxes.append(state.facts["8x7"].box)
	for i in range(1, boxes.size()):
		assert_gte(boxes[i], boxes[i - 1])
	assert_eq(state.facts["8x7"].box, FactTuning.MASTERY_BOX)


func test_credit_survives_a_serialisation_round_trip_of_the_state() -> void:
	var state := _fluent(_both_at_box_1(), "7x8").state
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(), {"scheduler": state})
	var reloaded: Dictionary = FarmSaveCodec.decode(FarmSaveCodec.encode(farm)).scheduler
	assert_eq(_fluent(reloaded, "7x8").state.facts["8x7"].box, 2)


func test_a_wrong_answer_earns_no_credit() -> void:
	assert_false(_fluent(_both_at_box_1(), "7x8", 0).state.commute_credit.has("8x7"))


func test_an_un_introduced_or_already_mastered_twin_is_left_alone() -> void:
	var unintroduced := Fixtures.with_fact(Fixtures.fresh(), "7x8", {"box": 1})
	var after_a := _fluent(unintroduced, "7x8").state
	assert_false(after_a.facts["8x7"].introduced)
	assert_false(after_a.commute_credit.has("8x7"))

	var mastered := Fixtures.with_fact(unintroduced, "8x7", {"box": FactTuning.MASTERY_BOX, "due_at": 40})
	var after_b := _fluent(mastered, "7x8").state
	assert_eq(after_b.facts["8x7"].due_at, 40)
	assert_false(after_b.commute_credit.has("8x7"))


func test_a_square_7x7_has_no_distinct_twin_to_promote() -> void:
	var after := _fluent(Fixtures.with_fact(Fixtures.fresh(), "7x7", {"box": 1}), "7x7").state
	assert_eq(after.facts["7x7"].box, 2)
	assert_eq(after.commute_credit, {})


# ─── grading reports mastery milestones ───

func test_fact_mastered_and_family_just_mastered_fire_on_the_completing_answer_only() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "1x1", {"box": 4, "recent_latencies": [900, 900]})
	var first := Fixtures.grade(state, "1x1", 1, 900)
	assert_eq(first.result.new_box, 5)
	assert_true(first.result.fact_mastered)
	assert_eq(first.result.family_just_mastered, 1)

	var second := Fixtures.grade(first.state, "1x1", 1, 900)
	assert_false(second.result.fact_mastered)
	assert_eq(second.result.family_just_mastered, FactTuning.NO_FAMILY)


func test_unlocks_the_next_tier_when_the_current_one_crosses_the_80_percent_gate() -> void:
	var base := Fixtures.fresh()
	var tier1: Array = base.facts.keys().filter(func(id: String) -> bool:
		var operands := Array(id.split("x")).map(func(n: String) -> int: return int(n))
		return operands.any(func(n: int) -> bool: return n == 1 or n == 2 or n == 10))
	var state := Fixtures.with_facts(base, tier1, {"box": 4})
	assert_eq(Fixtures.grade(state, "1x1", 1, 900).state.unlocked_tiers, [1, 2])
