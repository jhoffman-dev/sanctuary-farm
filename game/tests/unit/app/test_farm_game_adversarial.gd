## farm-game.adversarial.test.ts
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const Digest := preload("res://tests/support/oracle_digest.gd")
const FLUENT_MS := 1500


func _loaded(farm: Variant = null, seed_value: int = 1, start_at: int = 0) -> Harness:
	var built := Harness.new(farm, seed_value, start_at)
	await built.game.load_farm()
	return built


func _paddock(questions: Variant) -> RoundPlan:
	return RoundPlan.new(SessionContext.PADDOCK, questions)


func _farm_with(changes: Dictionary) -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(), changes)


func _answer_into(game: FarmGame, given: float, outcomes: Array) -> void:
	outcomes.append(await game.answer(given))


# ─── out-of-order use of the facade ───

func test_answer_before_load_rejects_rather_than_grading_against_nothing() -> void:
	var built := Harness.new()
	assert_false((await built.game.answer(1)).ok)
	assert_null(built.game.current_question())


func test_end_round_twice_the_second_rejects_and_the_log_is_appended_exactly_once() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(2))
	await built.game.answer(0)
	await built.game.end_round()
	assert_string_contains((await built.game.end_round()).error, "no active round")
	assert_eq(built.store.stored.sessions.size(), 1)


func test_answer_after_end_round_rejects_and_changes_nothing() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(3))
	await built.game.answer(0)
	await built.game.end_round()
	var writes := built.store.saved.size()
	assert_string_contains((await built.game.answer(0)).error, "no active round")
	assert_eq(built.store.saved.size(), writes)
	assert_eq(built.game.summary().value.coins, 0)


func test_buy_feed_mid_round_keeps_the_in_flight_question_and_the_purchase_survives_the_next_answer() -> void:
	var built := await _loaded(_farm_with({"coins": 10}))
	var question: Question = built.game.start_round(_paddock(3)).value
	assert_true((await built.game.buy_feed()).ok)
	assert_true(is_same(built.game.current_question(), question))
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, 3, false])
	await built.game.answer(Harness.correct_answer_to(question))
	assert_eq(built.game.summary().value.feed, Coins.STARTING_FEED + 10)
	assert_eq(built.game.summary().value.coins, 10 - FeedShed.SACK_PRICE + 2)
	assert_eq(built.store.stored.feed, Coins.STARTING_FEED + 10)


func test_set_muted_mid_round_does_not_lose_the_served_question_from_the_scheduler_state() -> void:
	var built := await _loaded()
	var question: Question = built.game.start_round(_paddock(2)).value
	await built.game.set_muted(true)
	assert_eq(built.store.stored.scheduler.last_served, question.fact_id)
	await built.game.answer(Harness.correct_answer_to(question))
	assert_eq(built.store.stored.scheduler.facts[question.fact_id].total_attempts, 1)


func test_two_answer_calls_issued_without_awaiting_grade_the_tapped_question_once_and_reject_the_second() -> void:
	var built := await _loaded()
	var first: Question = built.game.start_round(_paddock(3)).value
	# A double tap: both calls answer the question on screen. By the time the
	# second runs, that question has been graded and replaced.
	built.store.hold_writes = true
	var outcomes := []
	_answer_into(built.game, Harness.correct_answer_to(first), outcomes)
	_answer_into(built.game, Harness.correct_answer_to(first), outcomes)
	built.store.hold_writes = false
	built.store.release()
	assert_eq(outcomes.size(), 2)
	assert_true(outcomes[0].ok)
	assert_string_contains(outcomes[1].error, "no longer in flight")
	assert_eq(built.store.stored.scheduler.global_counter, 1)
	assert_eq(built.store.stored.coins, 2)


func test_a_double_tap_does_not_promote_or_mint_against_the_next_question_on_a_clock_that_keeps_moving() -> void:
	var built := await _loaded()
	built.clock.step = FLUENT_MS
	var first: Question = built.game.start_round(_paddock(3)).value
	built.store.hold_writes = true
	var outcomes := []
	_answer_into(built.game, Harness.correct_answer_to(first), outcomes)
	_answer_into(built.game, Harness.correct_answer_to(first), outcomes)
	built.store.hold_writes = false
	built.store.release()
	var graded: Array = built.store.stored.scheduler.facts.values().filter(
		func(status: Dictionary) -> bool: return status.total_attempts > 0
	)
	assert_eq(graded.map(func(status: Dictionary) -> String: return status.id), [first.fact_id])
	assert_eq(graded[0].box, 2)
	assert_eq(built.store.stored.coins, 2)
	assert_eq(Harness.progress_of(built.game.round_progress()), [2, 3, false])


func test_load_a_second_time_mid_round_does_not_fail_and_leaves_no_round_active() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(3))
	await built.game.answer(0)
	await built.game.load_farm()
	assert_null(built.game.current_question())
	assert_eq(Harness.progress_of(built.game.round_progress()), [0, 0, false])


# ─── start_round — plan validation ───

func test_rejects_questions_that_are_not_a_positive_whole_number_and_leaves_no_round_active() -> void:
	for questions: Variant in [-1, 1.5, NAN, INF, 5e-324, "3", null]:
		var built := await _loaded()
		assert_string_contains(built.game.start_round(_paddock(questions)).error, "positive integer", str(questions))
		assert_null(built.game.current_question())
		assert_true(built.game.start_round(_paddock(1)).ok)


func test_rejects_an_egg_round_for_a_family_that_has_no_facts_instead_of_silently_minting_coins_on_mixed_practice() -> void:
	for family: Variant in [0, -1, 13, NAN, 1.5]:
		var built := await _loaded()
		assert_false(built.game.start_round(RoundPlan.new(SessionContext.EGG, 3, family)).ok, str(family))


# ─── latency — the clock is the only source ───

func test_a_clock_that_goes_backwards_never_yields_a_negative_latency_in_the_feedback_or_the_log() -> void:
	var built := await _loaded(null, 1, 10000)
	var question: Question = built.game.start_round(_paddock(2)).value
	built.clock.now = 9000
	var feedback: AnswerFeedback = (await built.game.answer(Harness.correct_answer_to(question))).value
	var session_log: Dictionary = (await built.game.end_round()).value
	assert_gte(feedback.latency_ms, 0.0)
	assert_gte(session_log.entries[0].latency_ms, 0.0)


func test_a_clock_that_goes_backwards_does_not_award_fluent_and_two_coins_for_free() -> void:
	var built := await _loaded(null, 1, 10000)
	var question: Question = built.game.start_round(_paddock(2)).value
	built.clock.now = 0
	var feedback: AnswerFeedback = (await built.game.answer(Harness.correct_answer_to(question))).value
	assert_ne(feedback.outcome, Outcome.FLUENT)
	assert_lt(feedback.coins_earned, 2)


func test_latency_is_measured_from_the_serve_not_from_start_round_or_the_previous_answer() -> void:
	var built := await _loaded()
	var first: Question = built.game.start_round(_paddock(3)).value
	built.clock.advance(20000)
	await built.game.answer(Harness.correct_answer_to(first))
	var second := built.game.current_question()
	built.clock.advance(FLUENT_MS)
	var feedback: AnswerFeedback = (await built.game.answer(Harness.correct_answer_to(second))).value
	assert_eq(feedback.latency_ms, float(FLUENT_MS))
	assert_eq(feedback.outcome, Outcome.FLUENT)


func test_a_stalled_clock_zero_latency_grades_fluent_rather_than_crashing() -> void:
	var built := await _loaded()
	var question: Question = built.game.start_round(_paddock(1)).value
	var feedback: AnswerFeedback = (await built.game.answer(Harness.correct_answer_to(question))).value
	assert_eq(feedback.latency_ms, 0.0)
	assert_eq(feedback.outcome, Outcome.FLUENT)


# ─── a save store that refuses ───

func test_answer_does_not_advance_the_round_behind_the_callers_back_when_the_store_refuses() -> void:
	var built := await _loaded()
	var question: Question = built.game.start_round(_paddock(3)).value
	built.store.refuse_next = true
	var answered: Result = await built.game.answer(Harness.correct_answer_to(question))
	assert_false(answered.ok)
	assert_true(is_same(built.game.current_question(), question))
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, 3, false])


func test_the_in_memory_farm_never_gets_ahead_of_the_store_without_the_caller_being_told() -> void:
	var built := await _loaded()
	var question: Question = built.game.start_round(_paddock(3)).value
	built.store.refuse_next = true
	assert_false((await built.game.answer(Harness.correct_answer_to(question))).ok)
	# A refused answer must not have minted coins the store never saw.
	var stored_coins: int = built.store.stored.coins if built.store.stored != null else 0
	assert_eq(built.game.summary().value.coins, stored_coins)


func test_end_round_with_a_refusing_store_does_not_drop_the_session_log_silently() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(2))
	await built.game.answer(0)
	built.store.refuse_next = true
	assert_false((await built.game.end_round()).ok)
	# The log could not be persisted, so the round is still open and the end can be retried.
	assert_true((await built.game.end_round()).ok)
	assert_eq(built.store.stored.sessions.size(), 1)


# ─── loading unusual saves ───

func test_settings_and_scheduler_max_table_disagreeing_the_summary_follows_the_scheduler() -> void:
	var mismatched := FarmSave.with_changes(Fixtures.fresh_farm(5), {"settings": {"muted": false, "max_table": 12}})
	var built := await _loaded(mismatched)
	var families: Array = built.game.summary().value.families.map(func(f: Dictionary) -> int: return f.family)
	assert_eq(families, [1, 2, 3, 4, 5])
	assert_lte(built.game.start_round(_paddock(1)).value.family, 5)


# ─── answer values ───

func test_an_answer_that_is_not_the_product_grades_wrong_pays_nothing_and_serves_the_next_question() -> void:
	for given: float in [NAN, 1.5, -0.0, INF]:
		var built := await _loaded()
		built.game.start_round(_paddock(2))
		var feedback: AnswerFeedback = (await built.game.answer(given)).value
		assert_eq([feedback.outcome, feedback.correct, feedback.coins_earned], [Outcome.WRONG, false, 0], str(given))
		assert_eq(feedback.next.index, 1)


# ─── session log correctness ───

func test_an_early_end_round_with_a_question_in_flight_logs_only_graded_answers_with_consecutive_asked_at_values() -> void:
	var built := await _loaded(null, 1, 500)
	built.game.start_round(_paddock(5))
	for i in 3:
		built.clock.advance(1000)
		await built.game.answer(0)
	assert_not_null(built.game.current_question())
	var session_log: Dictionary = (await built.game.end_round()).value
	assert_eq(session_log.entries.map(func(entry: Dictionary) -> int: return entry.asked_at), [0, 1, 2])
	assert_true(session_log.entries.all(func(entry: Dictionary) -> bool: return entry.latency_ms == 1000.0))
	assert_null(built.game.current_question())


func test_a_round_resumed_after_an_early_end_starts_numbering_asked_at_where_the_scheduler_left_off() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(5))
	await built.game.answer(0)
	await built.game.answer(0)
	await built.game.end_round()
	built.game.start_round(_paddock(2))
	await built.game.answer(0)
	var session_log: Dictionary = (await built.game.end_round()).value
	assert_eq(session_log.entries.map(func(entry: Dictionary) -> int: return entry.asked_at), [2])


func test_the_dropped_in_flight_question_is_not_graded_its_fact_keeps_zero_attempts() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(5))
	await built.game.answer(0)
	var dropped := built.game.current_question()
	await built.game.end_round()
	assert_eq(built.store.stored.scheduler.facts[dropped.fact_id].total_attempts, 0)


func test_coins_never_decrease_through_answers_and_feed_never_changes_through_answers() -> void:
	var built := await _loaded(_farm_with({"coins": 5}))
	built.game.start_round(_paddock(12))
	var coins := 5
	for i in 12:
		built.clock.advance(900 if i % 2 == 0 else 9000)
		var question := built.game.current_question()
		await built.game.answer(-1 if i % 3 == 0 else Harness.correct_answer_to(question))
		var summary: FarmSummary = built.game.summary().value
		assert_gte(summary.coins, coins)
		coins = summary.coins
		assert_eq(summary.feed, Coins.STARTING_FEED)


# ─── determinism through the facade ───

func _script(seed_value: int) -> Dictionary:
	var built := await _loaded(null, seed_value, 1000)
	for round_number in 4:
		var plan := _paddock(6) if round_number % 2 == 0 else RoundPlan.new(SessionContext.EGG, 6, 3)
		built.game.start_round(plan)
		for i in 6:
			var question := built.game.current_question()
			built.clock.advance(5000 if i % 3 == 0 else 1200)
			await built.game.answer(-1 if i % 5 == 0 else Harness.correct_answer_to(question))
		await built.game.end_round()
	return built.store.stored


func test_the_same_seed_and_clock_script_produce_deep_equal_stored_farms() -> void:
	var first := await _script(11)
	assert_eq(first, await _script(11))
	var expected: String = Digest.oracles().farmScript11
	assert_eq(Digest.canonical_farm(first).sha256_text(), expected, "the farm TypeScript stores for the same script")
