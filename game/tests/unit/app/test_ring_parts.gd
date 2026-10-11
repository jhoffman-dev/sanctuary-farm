## The training ring's read-models built straight from the rules' state: what
## the scene draws, with every step's answer kept off the pad until answered.
extends GutTest


func _training(fact_id: String) -> Training:
	return TrainingRing.begin(FactTable.get_fact(fact_id))


func _answered(training: Training, given: float) -> Training:
	return TrainingRing.answer_step(training, given).value


func test_a_step_prompt_is_the_sum_without_its_answer() -> void:
	var prompt := StepPrompt.of(StrategyStep.minus(70, 14))
	assert_eq([prompt.left, prompt.op, prompt.right], [70, StrategyStep.MINUS, 14])
	assert_false("answer" in prompt)


func test_a_worked_step_shows_the_answer_and_what_was_typed() -> void:
	var worked := WorkedStepSummary.of_worked(WorkedStep.new(StrategyStep.double(28), 55))
	assert_eq([worked.left, worked.op, worked.right, worked.answer], [28, StrategyStep.DOUBLE, 2, 56])
	assert_eq(worked.given, 55.0)
	assert_false(worked.correct)


func test_a_training_summary_draws_the_area_model_for_every_strategy() -> void:
	var summary := TrainingSummary.of(TrainingRing.another_way(_training("9x12")))
	assert_eq(summary.strategy, Strategy.TEN_ANCHOR)
	assert_eq([summary.rows, summary.cols, summary.split_at], [9, 12, 5])
	assert_eq(summary.step_count, 3)


func test_a_training_summary_lists_the_worked_steps_in_order() -> void:
	var summary := TrainingSummary.of(_answered(_answered(_training("6x7"), 30), 13))
	assert_eq(summary.worked.map(func(step: WorkedStepSummary) -> int: return step.answer), [30, 12])
	assert_eq(summary.worked.map(func(step: WorkedStepSummary) -> bool: return step.correct), [true, false])
	assert_eq([summary.current_step.left, summary.current_step.op, summary.current_step.right], [30, StrategyStep.PLUS, 12])


func test_the_summary_hint_is_a_copy() -> void:
	var training := _training("7x8")
	TrainingSummary.of(training).hint["parts"] = [1, 7]
	assert_eq(TrainingSummary.of(training).hint, {"parts": [5, 3]})


func test_step_feedback_is_the_last_step_answered_and_its_sound() -> void:
	var feedback := StepFeedback.of(_answered(_training("6x7"), 30))
	assert_eq(feedback.worked.answer, 30)
	assert_eq(feedback.sound, Sounds.CORRECT)
	assert_eq(feedback.training.worked.size(), 1)
	assert_eq(StepFeedback.of(_answered(_training("6x7"), 31)).sound, Sounds.WRONG)


func test_the_ring_summary_offers_the_tables_facts_and_any_training() -> void:
	assert_null(RingSummary.of(12, null).training)
	assert_eq(RingSummary.of(8, null).offered_facts.size(), 7)
	assert_eq(RingSummary.of(12, _training("7x7")).training.fact_id, "7x7")
