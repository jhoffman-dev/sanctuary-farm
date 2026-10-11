## The training ring's rules: which facts it offers and accepts, working a
## strategy step by step on the pad, a wrong step shown worked out and passed
## (never punished), and "another way" moving through the fact's strategies.
extends GutTest

const ScriptedRng := preload("res://tests/fakes/scripted_rng.gd")


func _training(fact_id: String) -> Training:
	return TrainingRing.begin(TrainingRing.check_fact(fact_id, 12).value)


## Answers every remaining step, rightly or with the answer + 1.
func _work(training: Training, correctly: Array[bool]) -> Training:
	var worked := training
	for right in correctly:
		var step := TrainingRing.current_step(worked)
		var answered := TrainingRing.answer_step(worked, step.answer + (0 if right else 1))
		assert_true(answered.ok, answered.error)
		worked = answered.value
	return worked


# ─── which facts ───

func test_the_ring_offers_the_prototypes_ten_facts_in_order() -> void:
	assert_eq(TrainingRing.offered_facts(12), TrainingRing.PRACTICE_FACTS)
	assert_eq(TrainingRing.PRACTICE_FACTS.size(), 10)


func test_a_smaller_table_offers_only_its_facts() -> void:
	assert_eq(TrainingRing.offered_facts(8), ["6x7", "7x8", "6x8", "8x8", "7x7", "4x8", "6x6"])
	assert_eq(TrainingRing.offered_facts(5), [])


func test_pick_fact_draws_an_offered_fact_with_the_rng() -> void:
	assert_eq(TrainingRing.pick_fact(12, ScriptedRng.new([0.0])).value, "6x7")
	assert_eq(TrainingRing.pick_fact(12, ScriptedRng.new([0.99])).value, "9x12")
	assert_eq(TrainingRing.pick_fact(12, SeededRng.new(4)).value, TrainingRing.pick_fact(12, SeededRng.new(4)).value)


func test_pick_fact_is_refused_when_nothing_is_offered() -> void:
	assert_false(TrainingRing.pick_fact(5, SeededRng.new(1)).ok)


func test_any_fact_of_the_table_can_be_trained() -> void:
	var checked := TrainingRing.check_fact("3x4", 12)
	assert_true(checked.ok, checked.error)
	assert_eq(checked.value.id, "3x4")


func test_a_fact_outside_the_table_is_unknown() -> void:
	assert_eq(TrainingRing.check_fact("13x2", 12).error, TrainingRing.UNKNOWN_FACT)
	assert_eq(TrainingRing.check_fact("9x12", 8).error, TrainingRing.UNKNOWN_FACT)
	assert_eq(TrainingRing.check_fact("seven", 12).error, TrainingRing.UNKNOWN_FACT)
	assert_eq(TrainingRing.check_fact(56, 12).error, TrainingRing.UNKNOWN_FACT)


func test_a_times_1_fact_has_nothing_to_break_down() -> void:
	assert_eq(TrainingRing.check_fact("5x1", 12).error, TrainingRing.NOTHING_TO_BREAK_DOWN)


# ─── working a strategy ───

func test_training_starts_on_the_first_strategys_first_step() -> void:
	var training := _training("7x8")
	assert_eq(training.strategy.key, Strategy.AREA_MODEL)
	var step := TrainingRing.current_step(training)
	assert_eq([step.left, step.op, step.right], [7, StrategyStep.TIMES, 5])
	assert_false(TrainingRing.is_strategy_done(training))


func test_a_right_step_moves_on_to_the_next() -> void:
	var training := _work(_training("7x8"), [true])
	assert_true(training.worked[0].correct)
	var step := TrainingRing.current_step(training)
	assert_eq([step.left, step.op, step.right], [7, StrategyStep.TIMES, 3])


func test_a_wrong_step_is_worked_out_and_still_moves_on() -> void:
	var training := _work(_training("7x8"), [false])
	var worked := training.worked[0]
	assert_false(worked.correct)
	assert_eq(worked.given, 36.0)
	assert_eq(worked.step.answer, 35)
	var step := TrainingRing.current_step(training)
	assert_eq([step.left, step.op, step.right], [7, StrategyStep.TIMES, 3], "the next step uses the right numbers")


func test_the_whole_is_right_only_when_every_step_was() -> void:
	var clean := _work(_training("7x8"), [true, true, true])
	assert_true(TrainingRing.is_strategy_done(clean))
	assert_true(TrainingRing.all_correct(clean))
	var slip := _work(_training("7x8"), [true, false, true])
	assert_true(TrainingRing.is_strategy_done(slip))
	assert_false(TrainingRing.all_correct(slip))
	assert_false(TrainingRing.all_correct(_work(_training("7x8"), [true, true])), "not done yet")


func test_a_done_strategy_takes_no_more_answers() -> void:
	var done := _work(_training("4x8"), [true, true, true])
	assert_null(TrainingRing.current_step(done))
	assert_eq(TrainingRing.answer_step(done, 32).error, TrainingRing.STRATEGY_DONE)


func test_answering_leaves_the_training_it_was_given_alone() -> void:
	var training := _training("7x8")
	TrainingRing.answer_step(training, 35)
	assert_eq(training.worked.size(), 0)


func test_a_fraction_or_a_nonsense_number_is_simply_not_right() -> void:
	var halves := TrainingRing.answer_step(_training("7x8"), 35.5).value as Training
	assert_false(halves.worked[0].correct)
	var nonsense := TrainingRing.answer_step(_training("7x8"), NAN).value as Training
	assert_false(nonsense.worked[0].correct)


# ─── another way ───

func test_another_way_moves_to_the_next_strategy_from_its_first_step() -> void:
	var training := TrainingRing.another_way(_work(_training("7x8"), [true]))
	assert_eq(training.strategy.key, Strategy.TEN_ANCHOR)
	assert_eq(training.worked.size(), 0)
	var step := TrainingRing.current_step(training)
	assert_eq([step.left, step.op, step.right], [7, StrategyStep.TIMES, 10])


func test_another_way_wraps_after_the_last_strategy() -> void:
	var training := _training("7x8")
	for _i in 4:
		training = TrainingRing.another_way(training)
	assert_eq(training.strategy.key, Strategy.AREA_MODEL)


func test_a_fact_with_one_strategy_starts_it_again() -> void:
	var again := TrainingRing.another_way(_work(_training("3x3"), [true]))
	assert_eq(again.strategy.key, Strategy.AREA_MODEL)
	assert_eq(again.worked.size(), 0)
