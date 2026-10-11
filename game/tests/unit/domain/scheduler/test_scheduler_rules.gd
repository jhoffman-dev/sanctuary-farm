## Direct tests of the scheduler's building blocks — leitner, latency, cards,
## selection, interleave, introduce and commute. The TypeScript suite reaches
## these only through nextFact and gradeAnswer; here each rule is pinned on
## its own as well, so a regression names the rule that broke.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


func _card(state: Dictionary, id: String) -> Card:
	return Card.new(FactTable.get_fact(id), state.facts[id])


func _cards(state: Dictionary, ids: Array) -> Array[Card]:
	var cards: Array[Card] = []
	for id: String in ids:
		cards.append(_card(state, id))
	return cards


# ─── Result ───

func test_result_carries_a_value_or_a_reason() -> void:
	var good := Result.success(7)
	var bad := Result.failure("no")
	assert_eq([good.ok, good.value, good.error], [true, 7, ""])
	assert_eq([bad.ok, bad.value, bad.error], [false, null, "no"])


# ─── Leitner ───

func test_leitner_intervals_box_0_re_queues_like_box_1() -> void:
	assert_eq(Leitner.interval_for(0), 3)
	assert_eq([1, 2, 3, 4, 5].map(func(box: int) -> int: return Leitner.interval_for(box)), [3, 8, 20, 60, 150])


func test_leitner_clamp_box_keeps_a_box_in_0_to_5() -> void:
	assert_eq([Leitner.clamp_box(-2), Leitner.clamp_box(0), Leitner.clamp_box(3), Leitner.clamp_box(9)], [0, 0, 3, 5])


func test_leitner_box_after_each_outcome() -> void:
	assert_eq(Leitner.box_after(Outcome.FLUENT, 2), 3)
	assert_eq(Leitner.box_after(Outcome.FLUENT, 5), 5)
	assert_eq(Leitner.box_after(Outcome.LABORED, 3), 2)
	assert_eq(Leitner.box_after(Outcome.LABORED, 1), 1)
	assert_eq(Leitner.box_after(Outcome.WRONG, 5), 1)
	assert_eq(Leitner.box_after(Outcome.SLOW, 4), 4)


func test_leitner_a_slow_answer_re_queues_at_box_1s_interval() -> void:
	assert_eq(Leitner.requeue_interval(Outcome.SLOW, 4), 3)
	assert_eq(Leitner.requeue_interval(Outcome.FLUENT, 4), 60)


# ─── Latency ───

func test_latency_check_accepts_only_finite_non_negative_durations() -> void:
	assert_true(Latency.check(0.0).ok)
	assert_true(Latency.check(2999.5).ok)
	for bad: float in [-1.0, NAN, INF, -INF]:
		assert_false(Latency.check(bad).ok, str(bad))


func test_latency_classifies_at_the_exact_thresholds() -> void:
	assert_eq(Latency.classify_outcome(false, 100), Outcome.WRONG)
	assert_eq(Latency.classify_outcome(true, 2999), Outcome.FLUENT)
	assert_eq(Latency.classify_outcome(true, 3000), Outcome.SLOW)
	assert_eq(Latency.classify_outcome(true, 8000), Outcome.SLOW)
	assert_eq(Latency.classify_outcome(true, 8001), Outcome.LABORED)


func test_latency_rolling_mean_and_no_history_is_infinitely_slow() -> void:
	assert_eq(Latency.rolling_mean([1000, 2000, 4500]), 2500.0)
	assert_eq(Latency.rolling_mean([]), INF)


# ─── cards ───

func test_cards_in_family_and_due() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(), "2x3", {"due_at": 5})
	var family := SchedulerCards.in_family(state, 3)
	assert_eq(family.map(func(card: Card) -> String: return card.fact.id), ["1x3", "2x3", "3x1", "3x2", "3x3"])
	assert_eq(SchedulerCards.in_family(state, 3.5), [] as Array[Card])
	var card := _card(state, "2x3")
	assert_eq(SchedulerCards.overdue_by(card, 3), -2)
	assert_false(SchedulerCards.is_due(card, 4))
	assert_true(SchedulerCards.is_due(card, 5))


# ─── selection ───

func test_selection_most_overdue_keeps_the_earliest_of_equals() -> void:
	var state := Fixtures.with_facts(Fixtures.fresh(), ["1x1", "1x2", "2x1"], {"due_at": 4})
	state = Fixtures.with_fact(state, "1x2", {"due_at": 1})
	assert_eq(Selection.most_overdue(_cards(state, ["1x1", "1x2", "2x1"]), 10).fact.id, "1x2")
	assert_eq(Selection.most_overdue(_cards(state, ["1x1", "2x1"]), 10).fact.id, "1x1")


func test_selection_weight_adds_overdue_hard_core_and_low_box() -> void:
	var state := Fixtures.with_fact(Fixtures.with_fact(Fixtures.fresh(), "7x8", {"box": 2, "due_at": 10}), "2x2", {"box": 4, "due_at": 10})
	assert_eq(Selection.selection_weight(_card(state, "7x8"), 13), 3 * 2 + 3 + 2)
	assert_eq(Selection.selection_weight(_card(state, "2x2"), 5), 0, "not yet due, no bonuses")


func test_selection_worst_rolling_mean_prefers_no_history() -> void:
	var state := Fixtures.with_fact(Fixtures.with_fact(Fixtures.fresh(), "1x1", {"recent_latencies": [4000]}), "1x2", {"recent_latencies": [9000]})
	assert_eq(Selection.worst_rolling_mean(_cards(state, ["1x1", "1x2"])).fact.id, "1x2")
	assert_eq(Selection.worst_rolling_mean(_cards(state, ["1x1", "1x2", "2x1"])).fact.id, "2x1")


func test_selection_neediest_ranks_box_then_overdue_then_slowest() -> void:
	var state := Fixtures.with_facts(Fixtures.fresh(), ["1x1", "1x2", "2x1"], {"box": 2, "due_at": 0, "recent_latencies": [1000]})
	state = Fixtures.with_fact(state, "2x1", {"recent_latencies": [5000]})
	var cards := _cards(state, ["1x1", "1x2", "2x1"])
	assert_eq(Selection.neediest(cards, 0).fact.id, "2x1", "slowest when box and overdue tie")
	assert_lt(Selection.compare_need(cards[2], cards[0], 0), 0)
	assert_eq(Selection.compare_need(cards[0], cards[1], 0), 0)
	state = Fixtures.with_fact(state, "1x2", {"box": 1})
	assert_eq(Selection.neediest(_cards(state, ["1x1", "1x2", "2x1"]), 0).fact.id, "1x2", "a lower box wins")


# ─── interleave ───

func test_interleave_blocks_a_family_only_after_two_in_a_row() -> void:
	var state := Fixtures.fresh()
	assert_eq(Interleave.blocked_family(SchedulerState.with_changes(state, {"recent_families": [3]})), FactTuning.NO_FAMILY)
	assert_eq(Interleave.blocked_family(SchedulerState.with_changes(state, {"recent_families": [3, 4]})), FactTuning.NO_FAMILY)
	assert_eq(Interleave.blocked_family(SchedulerState.with_changes(state, {"recent_families": [4, 3, 3]})), 3)


func test_interleave_avoiding_family_relaxes_only_when_nothing_else_is_left() -> void:
	var state := Fixtures.fresh()
	var mixed_cards := _cards(state, ["1x2", "2x1", "1x1"])
	assert_eq(Interleave.avoiding_family(mixed_cards, 2).map(func(card: Card) -> String: return card.fact.id), ["1x1"])
	var only_twos := _cards(state, ["1x2", "2x1"])
	assert_eq(Interleave.avoiding_family(only_twos, 2), only_twos)
	assert_eq(Interleave.avoiding_family(mixed_cards, FactTuning.NO_FAMILY), mixed_cards)


func test_interleave_serve_records_the_family_and_keeps_four() -> void:
	var state := SchedulerState.with_changes(Fixtures.fresh(), {"recent_families": [1, 2, 10, 1]})
	var served := Interleave.serve(state, FactTable.get_fact("2x2"))
	assert_eq(served.state.recent_families, [2, 10, 1, 2])
	assert_eq(served.state.last_served, "2x2")
	assert_eq(state.recent_families, [1, 2, 10, 1], "the input is left alone")


# ─── introduce ───

func test_introduction_picks_the_lowest_unlocked_tier_in_table_order_and_skips_the_blocked_family() -> void:
	var state := Fixtures.fresh()
	assert_eq(Introduction.pick(state, SchedulerCards.in_play(state)).fact.id, "1x3")
	var blocked := SchedulerState.with_changes(state, {"recent_families": [3, 3]})
	assert_eq(Introduction.pick(blocked, SchedulerCards.in_play(blocked)).fact.id, "1x4")
	var none_left := Fixtures.with_facts(Fixtures.fresh(2), ["1x1"], {})
	assert_null(Introduction.pick(none_left, SchedulerCards.in_play(none_left)))


func test_introduction_marks_a_card_introduced_at_box_1_and_due_now() -> void:
	var state := SchedulerState.with_changes(Fixtures.fresh(), {"global_counter": 17})
	var after := Introduction.introduce(state, _card(state, "3x4"))
	assert_eq([after.facts["3x4"].introduced, after.facts["3x4"].box, after.facts["3x4"].due_at], [true, 1, 17])
	assert_false(state.facts["3x4"].introduced)


# ─── commute ───

func test_commute_credit_banks_half_a_box_then_promotes_the_twin() -> void:
	var state := Fixtures.with_fact(Fixtures.with_fact(Fixtures.fresh(), "3x4", {"box": 1}), "4x3", {"box": 2})
	var once := CommuteCredit.credit_twin(state, FactTable.get_fact("3x4"))
	assert_eq([once.facts["4x3"].box, once.commute_credit["4x3"]], [2, 0.5])
	var twice := CommuteCredit.credit_twin(once, FactTable.get_fact("3x4"))
	assert_eq([twice.facts["4x3"].box, twice.commute_credit["4x3"]], [3, 0.0])
	assert_eq(twice.facts["4x3"].due_at, state.global_counter + FactTuning.LEITNER_INTERVALS[3])
	assert_true(is_same(CommuteCredit.credit_twin(state, FactTable.get_fact("4x4")), state), "a square has no twin")
