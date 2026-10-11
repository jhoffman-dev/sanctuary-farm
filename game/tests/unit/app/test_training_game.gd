## FarmGame's training ring with fake adapters: ring() is the read-model the
## ring scene draws from, start_training / answer_step / another_way /
## end_training work a strategy on the pad, and — the one named decision —
## strategy steps never reach the scheduler: no mastery, no coins, no save.
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const DAY := 20_000
## 10:00 UTC on DAY.
const MORNING := DAY * CareDay.MSEC_PER_DAY + 10 * 3_600_000
const FLUENT_MS := 1500


func _loaded(farm: Variant = null, seed_value: int = 1) -> Harness:
	var built := Harness.new(farm, seed_value, MORNING)
	await built.game.load_farm()
	return built


func _started(built: Harness, fact_id: String) -> TrainingSummary:
	var started := built.game.start_training(fact_id)
	assert_true(started.ok, started.error)
	return started.value


## Answers the current strategy's remaining steps, each right or off by one.
func _work(built: Harness, correctly: Array[bool]) -> StepFeedback:
	var feedback: StepFeedback = null
	for right in correctly:
		built.clock.advance(FLUENT_MS)
		var expected := _expected(built)
		var answered := built.game.answer_step(expected + (0 if right else 1))
		assert_true(answered.ok, answered.error)
		feedback = answered.value
	return feedback


## The answer the current step expects, worked from the prompt the scene shows.
func _expected(built: Harness) -> int:
	var step: StepPrompt = built.game.ring().value.training.current_step
	match step.op:
		StrategyStep.PLUS:
			return step.left + step.right
		StrategyStep.MINUS:
			return step.left - step.right
	return step.left * step.right


func _prompt(step: StepPrompt) -> Array:
	return [step.left, step.op, step.right]


# ─── the read-model ───

func test_the_ring_is_refused_before_load() -> void:
	assert_string_contains(Harness.new().game.ring().error, "load_farm()")


func test_a_fresh_ring_offers_its_facts_and_nothing_is_under_way() -> void:
	var ring: RingSummary = (await _loaded()).game.ring().value
	assert_eq(ring.offered_facts, TrainingRing.PRACTICE_FACTS)
	assert_null(ring.training)


func test_starting_shows_the_fact_its_strategies_and_the_area_model() -> void:
	var training := _started(await _loaded(), "7x8")
	assert_eq([training.fact_id, training.a, training.b], ["7x8", 7, 8])
	assert_eq(training.strategy, Strategy.AREA_MODEL)
	assert_eq(training.strategies, [Strategy.AREA_MODEL, Strategy.TEN_ANCHOR, Strategy.DOUBLING, Strategy.NEAR_SQUARE])
	assert_eq([training.rows, training.cols, training.split_at], [7, 8, 5])
	assert_eq(training.hint, {"parts": [5, 3]})
	assert_eq(training.step_count, 3)
	assert_eq(_prompt(training.current_step), [7, StrategyStep.TIMES, 5])
	assert_eq(training.worked.size(), 0)
	assert_false(training.done)


func test_the_step_on_the_pad_never_carries_its_answer() -> void:
	var training := _started(await _loaded(), "7x8")
	assert_false("answer" in training.current_step)


func test_an_unsplit_b_draws_no_split() -> void:
	var training := _started(await _loaded(), "2x1")
	assert_eq([training.rows, training.cols, training.split_at], [2, 1, 0])
	assert_eq(training.strategy, Strategy.NEAR_SQUARE)


func test_the_ring_shows_the_training_under_way() -> void:
	var built := await _loaded()
	_started(built, "6x7")
	assert_eq(built.game.ring().value.training.fact_id, "6x7")


# ─── starting ───

func test_no_fact_picks_an_offered_one_with_the_rng() -> void:
	var picked := _started(await _loaded(null, 7), "")
	assert_true(TrainingRing.PRACTICE_FACTS.has(picked.fact_id), picked.fact_id)
	assert_eq(_started(await _loaded(null, 7), "").fact_id, picked.fact_id, "same seed, same fact")


func test_an_unknown_fact_is_refused_and_nothing_starts() -> void:
	var built := await _loaded()
	assert_eq(built.game.start_training("13x13").error, TrainingRing.UNKNOWN_FACT)
	assert_eq(built.game.start_training("9x1").error, TrainingRing.NOTHING_TO_BREAK_DOWN)
	assert_null(built.game.ring().value.training)


func test_training_is_refused_before_load() -> void:
	assert_string_contains(Harness.new().game.start_training("7x8").error, "load_farm()")


func test_training_is_refused_after_goodnight() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	built.game.end_training()
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC
	assert_eq(built.game.start_training("7x8").error, PlaySession.GOODNIGHT)
	assert_null(built.game.ring().value.training)


func test_starting_training_counts_as_play() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	built.game.end_training()
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC
	assert_true(built.game.session().value.goodnight)


# ─── answering steps ───

func test_a_right_step_is_worked_and_the_next_one_is_on_the_pad() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	var feedback := _work(built, [true])
	assert_true(feedback.worked.correct)
	assert_eq([feedback.worked.answer, feedback.worked.given], [35, 35.0])
	assert_eq(feedback.sound, Sounds.CORRECT)
	assert_eq(_prompt(feedback.training.current_step), [7, StrategyStep.TIMES, 3])


func test_a_wrong_step_shows_the_worked_answer_and_moves_on() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	var feedback := _work(built, [false])
	assert_false(feedback.worked.correct)
	assert_eq([feedback.worked.answer, feedback.worked.given], [35, 36.0])
	assert_eq(feedback.sound, Sounds.WRONG)
	assert_eq(_prompt(feedback.training.current_step), [7, StrategyStep.TIMES, 3])


func test_the_last_step_lands_on_the_product_and_grades_the_whole() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	var feedback := _work(built, [true, false, true])
	assert_eq(feedback.worked.answer, 56)
	assert_true(feedback.training.done)
	assert_null(feedback.training.current_step)
	assert_false(feedback.training.all_correct)
	assert_eq(feedback.training.worked.map(func(step: WorkedStepSummary) -> bool: return step.correct), [true, false, true])


func test_a_clean_strategy_is_all_correct() -> void:
	var built := await _loaded()
	_started(built, "4x8")
	built.game.another_way()
	built.game.another_way()
	var feedback := _work(built, [true, true])
	assert_eq(feedback.training.strategy, Strategy.DOUBLING)
	assert_true(feedback.training.all_correct)


func test_a_done_strategy_takes_no_more_answers() -> void:
	var built := await _loaded()
	_started(built, "4x8")
	built.game.another_way()
	built.game.another_way()
	_work(built, [true, true])
	assert_eq(built.game.answer_step(32).error, TrainingRing.STRATEGY_DONE)


func test_answer_step_is_refused_with_no_training() -> void:
	assert_eq((await _loaded()).game.answer_step(35).error, FarmGame.NO_TRAINING)


# ─── the mastery decision: steps are scaffolding, not recall ───

func test_training_steps_never_touch_mastery_coins_or_the_save() -> void:
	var built := await _loaded()
	var before := Harness.summary_fields(built.game.summary().value)
	var saves := built.store.saved.size()
	var egg_progress: float = built.game.nest().value.eggs[0].progress
	_started(built, "7x8")
	for _strategy in 4:
		var all_right: Array[bool] = []
		all_right.resize(built.game.ring().value.training.step_count)
		all_right.fill(true)
		_work(built, all_right)
		built.game.another_way()
	built.game.end_training()
	assert_eq(Harness.summary_fields(built.game.summary().value), before, "no coins, no families")
	assert_eq(built.store.saved.size(), saves, "nothing saved")
	assert_eq(built.game.nest().value.eggs[0].progress, egg_progress, "no egg grows")


func test_training_answers_never_enter_the_rounds_log_or_tally() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	_work(built, [true, true, true])
	assert_eq(built.game.session().value.answered_today, 0)
	assert_null(built.game.current_question())


# ─── another way and leaving ───

func test_another_way_moves_to_the_next_strategy() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	_work(built, [true])
	var next: TrainingSummary = built.game.another_way().value
	assert_eq(next.strategy, Strategy.TEN_ANCHOR)
	assert_eq(next.hint, {"from": 10, "by": 2, "direction": Strategies.LESS})
	assert_eq(_prompt(next.current_step), [7, StrategyStep.TIMES, 10])
	assert_eq(next.worked.size(), 0)


func test_another_way_is_allowed_after_goodnight() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC
	assert_true(built.game.another_way().ok)
	assert_true(built.game.answer_step(70).ok)


func test_another_way_and_end_training_are_refused_with_no_training() -> void:
	var built := await _loaded()
	assert_eq(built.game.another_way().error, FarmGame.NO_TRAINING)
	assert_eq(built.game.end_training().error, FarmGame.NO_TRAINING)


func test_end_training_leaves_the_ring_empty() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	assert_true(built.game.end_training().ok)
	assert_null(built.game.ring().value.training)


func test_reloading_drops_the_training() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	await built.game.load_farm()
	assert_null(built.game.ring().value.training)


# ─── one thing at a time ───

func test_no_round_starts_while_training_is_under_way() -> void:
	var built := await _loaded()
	_started(built, "7x8")
	assert_string_contains(built.game.start_round(RoundPlan.new(SessionContext.PADDOCK, 3)).error, "training")
	built.game.end_training()
	assert_true(built.game.start_round(RoundPlan.new(SessionContext.PADDOCK, 3)).ok)


func test_no_training_starts_during_a_round() -> void:
	var built := await _loaded()
	assert_true(built.game.start_round(RoundPlan.new(SessionContext.PADDOCK, 3)).ok)
	assert_string_contains(built.game.start_training("7x8").error, "a round is already active")
