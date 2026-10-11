extends GutTest

const Outcome := AnswerGrading.Outcome


func test_a_fresh_farm_has_nothing_yet() -> void:
	var progress := FarmProgress.new()
	assert_eq(progress.coins, 0)
	assert_eq(progress.questions_answered, 0)


func test_an_answer_adds_its_coins_and_counts_the_question() -> void:
	var progress := FarmProgress.new(5, 3).with_answer(Outcome.FLUENT)
	assert_eq(progress.coins, 7)
	assert_eq(progress.questions_answered, 4)


func test_a_wrong_answer_still_counts_as_answered() -> void:
	var progress := FarmProgress.new(5, 3).with_answer(Outcome.WRONG)
	assert_eq(progress.coins, 5)
	assert_eq(progress.questions_answered, 4)


func test_the_original_is_left_unchanged() -> void:
	var original := FarmProgress.new(1, 1)
	original.with_answer(Outcome.SLOW)
	assert_eq(original.coins, 1)
	assert_eq(original.questions_answered, 1)
