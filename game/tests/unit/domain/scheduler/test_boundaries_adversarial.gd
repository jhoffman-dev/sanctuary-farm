## scheduler/boundaries.adversarial.test.ts
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const FAR_FUTURE := 99999
const BAD_SIZES := [0, -1, 13, NAN, 1.5, INF, 1e12]


## Every introduced fact pushed out of reach, so nothing is due.
func _nothing_due(state: Dictionary) -> Dictionary:
	return Fixtures.with_facts(state, Fixtures.introduced_ids(state), {"due_at": FAR_FUTURE})


func _all_ids() -> Array[String]:
	return Fixtures.ids_of(FactTable.build().value)


# ─── max_table ───

func test_initial_scheduler_state_and_empty_farm_save_refuse_a_table_outside_the_range() -> void:
	# INF and 1e12 must be refused up front: building them would never finish.
	for max_table: Variant in BAD_SIZES:
		assert_false(SchedulerState.initial(max_table).ok, str(max_table))
		assert_string_contains(FarmSave.empty(max_table).error, "max_table", str(max_table))


func test_every_fact_a_state_holds_can_be_graded_for_every_valid_table_size() -> void:
	# get_fact only knows the 12×12 table, so no accepted size may create a fact outside it.
	for n in range(FactTuning.MIN_TABLE, FactTuning.MAX_TABLE_DEFAULT + 1):
		var state := Fixtures.fresh(n)
		var unknown: Array = state.facts.keys().filter(func(id: String) -> bool:
			return not Grading.grade_answer(Fixtures.with_fact(state, id, {"box": 1}), Answer.new(id, 1, 900)).ok)
		assert_eq(unknown, [], "n=%d" % n)


func test_empty_farm_save_keeps_settings_scheduler_and_fact_count_in_step_for_every_valid_n() -> void:
	for n in range(FactTuning.MIN_TABLE, FactTuning.MAX_TABLE_DEFAULT + 1):
		var farm := Fixtures.fresh_farm(n)
		assert_eq(farm.settings.max_table, n)
		assert_eq(farm.scheduler.max_table, n)
		assert_eq(farm.scheduler.facts.size(), n * n)


func test_a_single_fact_board_max_table_1_can_be_played_to_mastery_and_hatches() -> void:
	var steps := Fixtures.play(Fixtures.fresh(1), SeededRng.new(1), 30, Fixtures.always_fluent)
	assert_true(steps.all(func(step: Fixtures.Step) -> bool: return step.served.id == "1x1"))
	var state := Fixtures.final_state(steps, {})
	assert_true(Mastery.is_family_mastered(state, 1))
	assert_eq(Mastery.family_progress(state, 1), 1.0)


# ─── grade_answer — hostile inputs ───

func test_grading_an_un_introduced_fact_is_refused_so_box_0_iff_not_introduced_cannot_be_broken() -> void:
	var state := Fixtures.fresh()
	assert_false(state.facts["7x8"].introduced)
	for latency_ms in [900, 5000, 9000]:
		assert_string_contains(Grading.grade_answer(state, Answer.new("7x8", 56, latency_ms)).error, "never introduced")


func test_a_latency_that_is_not_a_finite_non_negative_duration_is_never_recorded() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "7x8", {"box": 3})
	for latency_ms: float in [NAN, INF, -INF, -1.0]:
		# Refusing is how the rules decline a nonsensical duration; nothing is recorded.
		assert_false(Grading.grade_answer(state, Answer.new("7x8", 56, latency_ms)).ok, str(latency_ms))


func test_a_nan_latency_on_a_correct_answer_must_not_demote_the_fact() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "7x8", {"box": 3})
	var graded := Grading.grade_answer(state, Answer.new("7x8", 56, NAN))
	assert_false(graded.ok, "refused rather than graded LABORED")
	assert_eq(state.facts["7x8"].box, 3)


func test_a_given_that_is_not_the_answer_grades_wrong_resets_to_box_1_and_reports_the_correct_answer() -> void:
	for given: float in [NAN, 1.5, -0.0, INF, 56.0000001]:
		var state := Fixtures.with_fact(Fixtures.fresh(), "7x8", {"box": 4, "recent_latencies": Fixtures.FLUENT})
		var graded := Fixtures.grade(state, "7x8", given, 900)
		assert_eq(graded.result.outcome, Outcome.WRONG, str(given))
		assert_eq(graded.result.correct_answer, 56)
		assert_eq(graded.state.facts["7x8"].box, 1)
		assert_eq(graded.state.facts["7x8"].correct_streak, 0)


func test_grades_the_first_fact_an_egg_round_introduces_into_a_family_with_nothing_introduced_yet() -> void:
	var state := Fixtures.fresh()
	var family5: Array = FactTable.facts_in_family(5).value
	assert_false(family5.any(func(fact: Fact) -> bool: return state.facts[fact.id].introduced))
	var served := Fixtures.next_in_family(state, 5, SeededRng.new(1))
	assert_eq(served.fact.family, 5)
	assert_true(served.state.facts[served.fact.id].introduced)
	assert_eq(served.state.facts[served.fact.id].box, 1)
	assert_eq(Fixtures.grade(served.state, served.fact.id, served.fact.answer, 900).result.new_box, 2)


func test_an_empty_fact_id_and_a_lookalike_id_are_refused_not_silently_graded() -> void:
	var state := Fixtures.fresh()
	for id in ["", "07x8", "8 x 7"]:
		assert_string_contains(Grading.grade_answer(state, Answer.new(id, 56, 900)).error, "unknown fact", id)


# ─── next_fact edge states ───

func test_serves_without_introducing_when_every_fact_is_mastered() -> void:
	var mastered := Fixtures.with_facts(
		Fixtures.fresh(), _all_ids(), {"box": FactTuning.MASTERY_BOX, "recent_latencies": Fixtures.FLUENT, "due_at": FAR_FUTURE}
	)
	var served := Fixtures.next_of(mastered, SeededRng.new(1))
	assert_not_null(served.fact)
	assert_eq(Fixtures.introduced_ids(served.state).size(), _all_ids().size())
	assert_true(served.state.facts.values().all(Mastery.is_fact_mastered))


func test_keeps_serving_mastered_facts_that_fall_due_again_mastery_is_not_retirement() -> void:
	var mastered := Fixtures.with_facts(
		Fixtures.fresh(), _all_ids(), {"box": FactTuning.MASTERY_BOX, "recent_latencies": Fixtures.FLUENT, "due_at": 0}
	)
	var state := SchedulerState.with_changes(mastered, {"global_counter": 200})
	assert_eq(state.facts[Fixtures.next_of(state, SeededRng.new(1)).fact.id].box, FactTuning.MASTERY_BOX)


func test_an_introduction_never_breaks_the_interleave_rule_when_the_lowest_tier_has_only_the_blocked_family_left() -> void:
	# Tier 1 in table order ends with 12×1, 12×2, 12×10 — all family 12. Two 12s were just
	# served and nothing is due, so the scheduler wants to introduce; it must not pick a third 12.
	var remaining := ["12x1", "12x2", "12x10"]
	var tier1 := Fixtures.ids_of(FactTable.facts_in_tier(1).value).filter(func(id: String) -> bool: return not remaining.has(id))
	var introduced := Fixtures.with_facts(Fixtures.fresh(), tier1, {"box": 2, "due_at": FAR_FUTURE})
	var state := SchedulerState.with_changes(introduced, {"recent_families": [12, 12]})
	assert_ne(Fixtures.next_of(state, SeededRng.new(1)).fact.family, 12)


func test_the_first_three_introductions_on_a_fresh_max_table_3_board_are_not_all_family_3() -> void:
	# Tier 1 on a 3×3 table has exactly four un-introduced facts, all family 3.
	var steps := Fixtures.play(_nothing_due(Fixtures.fresh(3)), SeededRng.new(1), 3, Fixtures.always_fluent)
	assert_ne(steps.map(func(step: Fixtures.Step) -> int: return step.served.family), [3, 3, 3])


func test_unlocks_the_next_tier_at_exactly_80_percent_of_the_current_tier_at_box_3_and_not_one_fact_fewer() -> void:
	var tier1 := Fixtures.ids_of(FactTable.facts_in_tier(1).value)
	var needed := ceili(tier1.size() * 0.8)
	var one_short := Fixtures.with_facts(Fixtures.fresh(), tier1.slice(0, needed - 1), {"box": 3})
	assert_eq(Fixtures.next_of(one_short, SeededRng.new(1)).state.unlocked_tiers, [1])
	var exactly := Fixtures.with_facts(Fixtures.fresh(), tier1.slice(0, needed), {"box": 3})
	assert_eq(Fixtures.next_of(exactly, SeededRng.new(1)).state.unlocked_tiers, [1, 2])


# ─── pick_in_family edge states ───

func test_does_not_repeat_the_sole_unmastered_fact_when_mastered_family_facts_could_be_asked_instead() -> void:
	var ids := Fixtures.ids_of(FactTable.facts_in_family(3).value)
	var mastered := Fixtures.with_facts(
		Fixtures.fresh(), ids, {"box": FactTuning.MASTERY_BOX, "recent_latencies": Fixtures.FLUENT, "due_at": FAR_FUTURE}
	)
	var one_left := Fixtures.with_fact(mastered, "3x3", {"box": 2, "recent_latencies": [2000], "due_at": 0})
	var state := SchedulerState.with_changes(one_left, {"last_served": "3x3", "recent_families": [3]})
	assert_ne(Fixtures.next_in_family(state, 3, SeededRng.new(1)).fact.id, "3x3")


func test_a_family_with_a_single_fact_family_1_necessarily_repeats_and_never_throws() -> void:
	var state := SchedulerState.with_changes(Fixtures.fresh(), {"last_served": "1x1"})
	assert_eq(Fixtures.next_in_family(state, 1, SeededRng.new(1)).fact.id, "1x1")


func test_a_family_with_no_facts_falls_back_to_mixed_practice_without_introducing_into_it() -> void:
	for family: Variant in [0, -1, 13, NAN, 1.5]:
		var state := Fixtures.fresh()
		var served := Fixtures.next_in_family(state, family, SeededRng.new(1))
		assert_true(float(served.fact.family) != float(family), "served family %d for %s" % [served.fact.family, family])
		assert_eq(served.state.facts.keys(), state.facts.keys())


# ─── progress and economy boundaries ───

func test_an_out_of_range_family_reports_0_progress_and_not_mastered() -> void:
	for family: Variant in [0, -1, 13, NAN, 1.5, INF]:
		assert_eq(Mastery.family_progress(Fixtures.fresh(), family), 0.0, str(family))
		assert_false(Mastery.is_family_mastered(Fixtures.fresh(), family), str(family))


func test_a_family_completed_by_a_twins_credit_still_reports_family_just_mastered() -> void:
	# Family 2 = 1×2, 2×1, 2×2. Credit on 2×1 (box 4, fluent recents, half a box banked) completes it.
	var base := Fixtures.with_facts(Fixtures.fresh(), ["1x2", "2x2"], {"box": FactTuning.MASTERY_BOX, "recent_latencies": Fixtures.FLUENT})
	var almost := Fixtures.with_fact(base, "2x1", {"box": 4, "recent_latencies": Fixtures.FLUENT})
	var state := SchedulerState.with_changes(almost, {"commute_credit": {"2x1": 0.5}})
	var graded := Fixtures.grade(state, "1x2", 2, 900)
	assert_eq(graded.state.facts["2x1"].box, FactTuning.MASTERY_BOX)
	assert_true(Mastery.is_family_mastered(graded.state, 2))
	assert_eq(graded.result.family_just_mastered, 2)


func test_one_coin_short_is_refused_and_leaves_the_farm_untouched() -> void:
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": Coins.FEED_BUNDLE_PRICE - 1})
	assert_eq(Coins.buy_feed_bundle(farm).error, Coins.NOT_ENOUGH_COINS)
	assert_eq(farm.coins, Coins.FEED_BUNDLE_PRICE - 1)


func test_exactly_the_price_leaves_zero_coins_never_negative() -> void:
	var bought := Coins.buy_feed_bundle(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": Coins.FEED_BUNDLE_PRICE}))
	assert_eq(bought.value.coins, 0)


func test_negative_coins_can_never_buy_feed() -> void:
	assert_false(Coins.buy_feed_bundle(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": -Coins.FEED_BUNDLE_PRICE})).ok)
