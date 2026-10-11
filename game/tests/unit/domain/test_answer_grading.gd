extends GutTest

const Outcome := AnswerGrading.Outcome


func test_a_wrong_answer_is_wrong_however_fast() -> void:
	assert_eq(AnswerGrading.classify(false, 0), Outcome.WRONG)
	assert_eq(AnswerGrading.classify(false, 20000), Outcome.WRONG)


func test_a_right_answer_under_three_seconds_is_fluent() -> void:
	assert_eq(AnswerGrading.classify(true, 0), Outcome.FLUENT)
	assert_eq(AnswerGrading.classify(true, 2999), Outcome.FLUENT)


func test_three_to_eight_seconds_inclusive_is_slow() -> void:
	assert_eq(AnswerGrading.classify(true, 3000), Outcome.SLOW)
	assert_eq(AnswerGrading.classify(true, 8000), Outcome.SLOW)


func test_over_eight_seconds_is_labored() -> void:
	assert_eq(AnswerGrading.classify(true, 8001), Outcome.LABORED)


func test_fluent_pays_two_coins_in_total() -> void:
	assert_eq(AnswerGrading.coins_for(Outcome.FLUENT), 2)


func test_slow_and_labored_pay_one_coin() -> void:
	assert_eq(AnswerGrading.coins_for(Outcome.SLOW), 1)
	assert_eq(AnswerGrading.coins_for(Outcome.LABORED), 1)


func test_a_wrong_answer_pays_nothing() -> void:
	assert_eq(AnswerGrading.coins_for(Outcome.WRONG), 0)
