## farm-game.test.ts (and SF-89's whenSaved suite). Every persisting call is a
## coroutine, so each test awaits it as a caller would.
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const FLUENT_MS := 1500
const SLOW_MS := 5000
const LABORED_MS := 9000


func _loaded(farm: Variant = null, seed_value: int = 1, start_at: int = 0) -> Harness:
	var built := Harness.new(farm, seed_value, start_at)
	await built.game.load_farm()
	return built


func _paddock(questions: int) -> RoundPlan:
	return RoundPlan.new(SessionContext.PADDOCK, questions)


func _farm_with(changes: Dictionary, max_table: int = 12) -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(max_table), changes)


## 1×1 is the whole of family 1: one fluent answer from box 4 masters both fact and family.
func _farm_about_to_master_family_one() -> Dictionary:
	var farm := Fixtures.fresh_farm()
	var primed := Fixtures.with_fact(farm.scheduler, "1x1", {"box": 4, "recent_latencies": [1000, 1000]})
	return FarmSave.with_changes(farm, {"scheduler": primed})


func _answered(built: Harness, given: float) -> AnswerFeedback:
	var answered: Result = await built.game.answer(given)
	assert_true(answered.ok, answered.error)
	return answered.value


# ─── load ───

func test_starts_a_fresh_farm_when_the_store_is_empty() -> void:
	var built := Harness.new()
	var summary := await built.game.load_farm()
	assert_eq([summary.coins, summary.feed, summary.muted], [0, Coins.STARTING_FEED, false])
	assert_eq(summary.families.map(func(f: Dictionary) -> int: return f.family), Array(FactTuning.ALL_FAMILIES))
	assert_true(summary.families.all(func(f: Dictionary) -> bool: return f.progress == 0.0 and not f.mastered))


func test_loads_an_existing_farm_and_reports_its_mute_setting() -> void:
	var saved := _farm_with({"coins": 7, "feed": 3, "settings": {"muted": true, "max_table": 12}})
	var built := Harness.new(saved)
	var summary := await built.game.load_farm()
	assert_eq([summary.coins, summary.feed, summary.muted], [7, 3, true])
	assert_eq(Harness.summary_fields(built.game.summary().value), Harness.summary_fields(summary))


func test_summarises_only_families_within_the_saves_max_table() -> void:
	var built := await _loaded(Fixtures.fresh_farm(5))
	var families: Array = built.game.summary().value.families.map(func(f: Dictionary) -> int: return f.family)
	assert_eq(families, [1, 2, 3, 4, 5])


func test_refuses_to_summarise_or_start_a_round_before_load() -> void:
	var built := Harness.new()
	assert_string_contains(built.game.summary().error, "load_farm()")
	assert_string_contains(built.game.start_round(_paddock(3)).error, "load_farm()")


# ─── start_round ───

func test_serves_a_real_question_and_keeps_it_stable_until_answered() -> void:
	var built := await _loaded()
	var first: Question = built.game.start_round(_paddock(5)).value
	assert_eq(first.index, 0)
	assert_eq(first.fact_id, "%dx%d" % [first.a, first.b])
	assert_eq(first.family, maxi(first.a, first.b))
	assert_true(is_same(built.game.current_question(), first))
	assert_true(is_same(built.game.current_question(), first))
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, 5, false])


func test_asks_the_scheduler_exactly_once_per_question() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(3))
	built.game.current_question()
	built.game.current_question()
	for i in 3:
		await built.game.answer(0)
	await built.game.end_round()
	# Serving appends one family per served fact, so the history length is the serve count.
	assert_eq(built.store.stored.scheduler.recent_families.size(), 3)


func test_draws_every_question_of_a_family_round_from_that_family() -> void:
	var built := await _loaded()
	var first: Question = built.game.start_round(RoundPlan.new(SessionContext.EGG, 4, 10)).value
	assert_eq(first.family, 10)
	var feedback := await _answered(built, Harness.correct_answer_to(first))
	assert_eq(feedback.next.family, 10)


func test_refuses_while_a_round_is_active_even_once_its_questions_are_all_answered() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(1))
	assert_string_contains(built.game.start_round(_paddock(1)).error, "already active")
	await built.game.answer(0)
	assert_string_contains(built.game.start_round(_paddock(1)).error, "already active")


func test_rejects_a_family_round_without_a_family_and_a_round_with_no_questions() -> void:
	var built := await _loaded()
	assert_string_contains(built.game.start_round(RoundPlan.new(SessionContext.STALL, 3)).error, "needs a family")
	assert_string_contains(built.game.start_round(RoundPlan.new(SessionContext.EGG, 3)).error, "needs a family")
	assert_string_contains(built.game.start_round(_paddock(0)).error, "positive")
	assert_null(built.game.current_question())


func test_rejects_a_family_outside_1_to_max_table_instead_of_falling_back_to_mixed_practice() -> void:
	var built := await _loaded(Fixtures.fresh_farm(5))
	assert_string_contains(built.game.start_round(RoundPlan.new(SessionContext.EGG, 3, 6)).error, "family must be")
	assert_string_contains(built.game.start_round(RoundPlan.new(SessionContext.PADDOCK, 3, 0)).error, "family must be")
	assert_true(built.game.start_round(RoundPlan.new(SessionContext.EGG, 3, 5)).ok)


func test_refuses_to_start_while_a_save_is_still_in_progress_so_the_commit_cannot_overwrite_the_served_question() -> void:
	var built := await _loaded(_farm_with({"coins": 10}))
	built.store.hold_writes = true
	var outcomes := []
	_buy_feed_into(built.game, outcomes)
	assert_eq(built.store.held, 1, "the purchase is waiting on the store")
	assert_string_contains(built.game.start_round(_paddock(1)).error, "save is still in progress")
	built.store.hold_writes = false
	built.store.release()
	assert_eq(outcomes.size(), 1)
	assert_true(built.game.start_round(_paddock(1)).ok)


func test_reports_idle_progress_when_no_round_is_active() -> void:
	var built := await _loaded()
	assert_eq(Harness.progress_of(built.game.round_progress()), [0, 0, false])


# ─── answer ───

func test_measures_latency_from_the_clock_not_from_the_caller() -> void:
	var built := await _loaded(null, 1, 1000)
	var question: Question = built.game.start_round(_paddock(3)).value
	built.clock.advance(FLUENT_MS)
	var feedback := await _answered(built, Harness.correct_answer_to(question))
	assert_eq(feedback.latency_ms, float(FLUENT_MS))
	assert_eq(feedback.outcome, Outcome.FLUENT)
	assert_true(is_same(feedback.question, question))
	assert_eq(feedback.correct_answer, Harness.correct_answer_to(question))


func test_pays_2_coins_for_a_fluent_paddock_answer() -> void:
	var built := await _loaded()
	var question: Question = built.game.start_round(_paddock(3)).value
	built.clock.advance(FLUENT_MS)
	var feedback := await _answered(built, Harness.correct_answer_to(question))
	assert_eq(feedback.coins_earned, 2)
	assert_eq(built.game.summary().value.coins, 2)


func test_pays_1_coin_for_a_slow_or_labored_answer() -> void:
	var built := await _loaded()
	var first: Question = built.game.start_round(_paddock(3)).value
	built.clock.advance(SLOW_MS)
	var slow := await _answered(built, Harness.correct_answer_to(first))
	assert_eq([slow.outcome, slow.coins_earned], [Outcome.SLOW, 1])
	built.clock.advance(LABORED_MS)
	var labored := await _answered(built, Harness.correct_answer_to(slow.next))
	assert_eq([labored.outcome, labored.coins_earned], [Outcome.LABORED, 1])
	assert_eq(built.game.summary().value.coins, 2)


func test_pays_nothing_for_a_wrong_answer_and_reports_the_right_one() -> void:
	var built := await _loaded()
	var question: Question = built.game.start_round(_paddock(3)).value
	built.clock.advance(FLUENT_MS)
	var feedback := await _answered(built, Harness.correct_answer_to(question) + 1)
	assert_eq([feedback.outcome, feedback.correct, feedback.coins_earned], [Outcome.WRONG, false, 0])
	assert_eq(feedback.correct_answer, Harness.correct_answer_to(question))
	assert_eq(built.game.summary().value.coins, 0)


func test_mints_no_coins_in_a_stall_or_free_round_even_when_fluent() -> void:
	for context: String in [SessionContext.STALL, SessionContext.FREE]:
		var built := await _loaded()
		var question: Question = built.game.start_round(RoundPlan.new(context, 2, 10)).value
		built.clock.advance(FLUENT_MS)
		var feedback := await _answered(built, Harness.correct_answer_to(question))
		assert_eq(feedback.outcome, Outcome.FLUENT, context)
		assert_eq(feedback.coins_earned, 0, context)
		assert_eq(built.game.summary().value.coins, 0, context)


func test_mints_coins_in_a_nest_round() -> void:
	var built := await _loaded()
	var question: Question = built.game.start_round(RoundPlan.new(SessionContext.EGG, 2, 10)).value
	built.clock.advance(FLUENT_MS)
	assert_eq((await _answered(built, Harness.correct_answer_to(question))).coins_earned, 2)


func test_plays_one_sound_per_outcome() -> void:
	var built := await _loaded()
	var first: Question = built.game.start_round(_paddock(3)).value
	built.clock.advance(FLUENT_MS)
	var fluent := await _answered(built, Harness.correct_answer_to(first))
	assert_eq(fluent.sounds, [Sounds.FLUENT] as Array[String])
	built.clock.advance(SLOW_MS)
	var slow := await _answered(built, Harness.correct_answer_to(fluent.next))
	assert_eq(slow.sounds, [Sounds.CORRECT] as Array[String])
	assert_eq((await _answered(built, -1)).sounds, [Sounds.WRONG] as Array[String])


func test_reports_mastery_and_plays_the_hatch_sound_when_an_answer_finishes_a_family() -> void:
	var built := await _loaded(_farm_about_to_master_family_one())
	var question: Question = built.game.start_round(RoundPlan.new(SessionContext.EGG, 1, 1)).value
	assert_eq(question.fact_id, "1x1")
	built.clock.advance(FLUENT_MS)
	var feedback := await _answered(built, 1)
	assert_true(feedback.fact_mastered)
	assert_eq(feedback.family_just_mastered, 1)
	assert_eq(feedback.sounds, [Sounds.FLUENT, Sounds.HATCH] as Array[String])
	assert_eq(built.game.summary().value.families[0], {"family": 1, "progress": 1.0, "mastered": true})


func test_completes_the_round_after_n_questions() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(3))
	var first := await _answered(built, 0)
	assert_eq(first.next.index, 1)
	assert_true(is_same(first.next, built.game.current_question()))
	assert_eq(Harness.progress_of(built.game.round_progress()), [2, 3, false])
	assert_eq((await _answered(built, 0)).next.index, 2)
	assert_null((await _answered(built, 0)).next)
	assert_null(built.game.current_question())
	assert_eq(Harness.progress_of(built.game.round_progress()), [3, 3, true])
	assert_string_contains((await built.game.answer(0)).error, "no longer in flight")


func test_throws_when_nothing_is_in_flight() -> void:
	var built := await _loaded()
	assert_string_contains((await built.game.answer(4)).error, "no active round")


func test_persists_the_farm_after_every_answer_with_the_scheduler_advanced() -> void:
	var built := await _loaded()
	built.game.start_round(_paddock(3))
	assert_eq(built.store.saved.size(), 0)
	await built.game.answer(0)
	assert_eq(built.store.saved.size(), 1)
	await built.game.answer(0)
	assert_eq(built.store.saved.size(), 2)
	assert_eq(built.store.stored.scheduler.global_counter, 2)
	assert_ne(built.store.stored.scheduler, Fixtures.fresh_farm().scheduler)


# ─── end_round ───

func test_appends_a_session_log_with_one_entry_per_graded_answer_and_persists_it() -> void:
	var built := await _loaded(null, 1, 10000)
	var first: Question = built.game.start_round(_paddock(2)).value
	built.clock.advance(FLUENT_MS)
	await built.game.answer(Harness.correct_answer_to(first))
	built.clock.advance(SLOW_MS)
	var second := built.game.current_question()
	await built.game.answer(Harness.correct_answer_to(second) + 1)
	built.clock.advance(500)

	var session_log: Dictionary = (await built.game.end_round()).value
	assert_eq([session_log.started_at, session_log.ended_at, session_log.context, session_log.family], [10000, 17000, "paddock", null])
	assert_eq(session_log.entries, [
		{"fact_id": first.fact_id, "given": float(Harness.correct_answer_to(first)), "correct": true,
			"latency_ms": float(FLUENT_MS), "outcome": Outcome.FLUENT, "asked_at": 0},
		{"fact_id": second.fact_id, "given": float(Harness.correct_answer_to(second) + 1), "correct": false,
			"latency_ms": float(SLOW_MS), "outcome": Outcome.WRONG, "asked_at": 1},
	])
	assert_eq(built.store.stored.sessions, [session_log])
	assert_null(built.game.current_question())
	assert_true(built.game.start_round(_paddock(1)).ok)


func test_closes_early_dropping_the_unanswered_question_and_recording_the_family() -> void:
	var built := await _loaded()
	built.game.start_round(RoundPlan.new(SessionContext.EGG, 5, 10))
	await built.game.answer(0)
	var session_log: Dictionary = (await built.game.end_round()).value
	assert_eq(session_log.family, 10)
	assert_eq(session_log.context, SessionContext.EGG)
	assert_eq(session_log.entries.size(), 1)
	assert_eq(built.store.stored.sessions.size(), 1)


func test_end_round_throws_when_no_round_is_active() -> void:
	var built := await _loaded()
	assert_string_contains((await built.game.end_round()).error, "no active round")


# ─── buy_feed ───

func test_trades_coins_for_a_feed_bundle_and_persists() -> void:
	var built := await _loaded(_farm_with({"coins": 10}))
	var bought: Result = await built.game.buy_feed()
	assert_true(bought.ok)
	assert_eq([bought.value.coins, bought.value.feed], [10 - FeedShed.SACK_PRICE, Coins.STARTING_FEED + FeedShed.SACK_FEED])
	assert_eq([built.store.stored.coins, built.store.stored.feed], [10 - FeedShed.SACK_PRICE, Coins.STARTING_FEED + FeedShed.SACK_FEED])


func test_refuses_without_enough_coins_and_writes_nothing() -> void:
	var built := await _loaded()
	var bought: Result = await built.game.buy_feed()
	assert_eq(bought.error, FeedShed.NOT_ENOUGH_COINS)
	assert_eq(built.store.saved.size(), 0)
	assert_eq(built.game.summary().value.feed, Coins.STARTING_FEED)


# ─── set_muted ───

func test_mutes_updates_the_summary_and_persists_the_setting() -> void:
	var built := await _loaded()
	await built.game.set_muted(true)
	assert_true(built.game.summary().value.muted)
	assert_true(built.store.stored.settings.muted)
	await built.game.set_muted(false)
	assert_eq(built.store.stored.settings, {"muted": false, "max_table": 12})
	assert_eq(built.store.saved.size(), 2)


# ─── when_saved (SF-89) ───

func test_resolves_at_once_when_nothing_is_saving() -> void:
	var built := await _loaded()
	var waiting := [false]
	_when_saved_into(built.game, waiting)
	assert_true(waiting[0])


func test_waits_for_every_save_queued_so_far_so_a_round_can_start_straight_after() -> void:
	var built := await _loaded()
	built.store.hold_writes = true
	var outcomes := []
	_set_muted_into(built.game, true, outcomes)
	_set_muted_into(built.game, false, outcomes)
	var waiting := [false]
	_when_saved_into(built.game, waiting)
	built.store.release()
	assert_false(waiting[0], "one save still to land")
	built.store.release()
	assert_true(waiting[0])
	assert_eq(built.store.saved.size(), 2)
	assert_true(built.game.start_round(RoundPresets.paddock()).ok)


func test_also_waits_for_a_save_queued_while_it_was_waiting() -> void:
	var built := await _loaded()
	built.store.hold_writes = true
	var outcomes := []
	_set_muted_into(built.game, true, outcomes)
	var waiting := [false]
	_when_saved_into(built.game, waiting)
	_set_muted_into(built.game, false, outcomes)
	built.store.release()
	assert_false(waiting[0])
	built.store.release()
	assert_true(waiting[0])
	assert_eq(built.store.saved.size(), 2)
	assert_false(built.game.summary().value.muted)


func test_resolves_not_rejects_when_the_save_it_waited_for_failed() -> void:
	var built := await _loaded()
	built.store.hold_writes = true
	built.store.refuse_writes = true
	var outcomes := []
	_set_muted_into(built.game, true, outcomes)
	var waiting := [false]
	_when_saved_into(built.game, waiting)
	built.store.release()
	assert_true(waiting[0])
	assert_false(outcomes[0].ok, "the failure is the setter's to report")


# ─── helpers: start a persisting call without awaiting it, as a second tap does ───

func _buy_feed_into(game: FarmGame, outcomes: Array) -> void:
	outcomes.append(await game.buy_feed())


func _set_muted_into(game: FarmGame, muted: bool, outcomes: Array) -> void:
	outcomes.append(await game.set_muted(muted))


func _when_saved_into(game: FarmGame, done: Array) -> void:
	await game.when_saved()
	done[0] = true
