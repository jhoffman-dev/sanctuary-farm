## Component test: the pad collects digits from taps and keys and emits them.
extends GutTest

const NumberPadScene := preload("res://scenes/ui/number_pad.tscn")

var _pad: NumberPad


func before_each() -> void:
	_pad = NumberPadScene.instantiate()
	add_child_autofree(_pad)
	watch_signals(_pad)


func _press_key(keycode: Key) -> void:
	var event := InputEventKey.new()
	event.keycode = keycode
	event.pressed = true
	_pad._unhandled_input(event)


func _tap(button_name: String) -> void:
	_pad.get_node("%" + button_name).pressed.emit()


func _result(correct: bool, answer: int, coins: int) -> AnswerResult:
	var result := AnswerResult.new()
	result.correct = correct
	result.correct_answer = answer
	result.coins_awarded = coins
	return result


func test_shows_the_question_with_a_times_sign() -> void:
	_pad.show_question(QuestionView.new(7, 8))
	assert_eq(_pad.get_node("%QuestionLabel").text, "7 × 8")
	assert_eq(_pad.get_node("%AnswerLabel").text, "?")


func test_taps_type_digits_and_ok_submits_them() -> void:
	_tap("Digit5")
	_tap("Digit6")
	_tap("Enter")
	assert_signal_emitted_with_parameters(_pad, "answer_submitted", [56])


func test_the_keyboard_types_digits_and_enter_submits() -> void:
	_press_key(KEY_4)
	_press_key(KEY_KP_2)
	_press_key(KEY_ENTER)
	assert_signal_emitted_with_parameters(_pad, "answer_submitted", [42])


func test_backspace_erases_the_last_digit() -> void:
	_press_key(KEY_1)
	_press_key(KEY_9)
	_press_key(KEY_BACKSPACE)
	_tap("Backspace")
	_tap("Digit8")
	_press_key(KEY_KP_ENTER)
	assert_signal_emitted_with_parameters(_pad, "answer_submitted", [8])


func test_an_empty_answer_is_not_submitted() -> void:
	_press_key(KEY_ENTER)
	assert_signal_not_emitted(_pad, "answer_submitted")


func test_a_long_answer_stops_at_four_digits() -> void:
	for i in 6:
		_press_key(KEY_9)
	assert_eq(_pad.get_node("%AnswerLabel").text, "9999")


func test_a_new_question_clears_the_typed_answer() -> void:
	_press_key(KEY_3)
	_pad.show_question(QuestionView.new(2, 2))
	assert_eq(_pad.get_node("%AnswerLabel").text, "?")


func test_a_right_answer_is_celebrated_with_its_coins() -> void:
	_pad.show_result(QuestionView.new(6, 7), _result(true, 42, 2))
	assert_eq(_pad.get_node("%FeedbackLabel").text, "Yes! 6 × 7 = 42  (+2)")


func test_a_wrong_answer_is_shown_gently_with_the_fact() -> void:
	_pad.show_result(QuestionView.new(6, 7), _result(false, 42, 0))
	var feedback: String = _pad.get_node("%FeedbackLabel").text
	assert_string_contains(feedback, "6 × 7 = 42")
	assert_false(feedback.to_lower().contains("wrong"), feedback)


func test_pad_buttons_never_take_focus_so_enter_cannot_press_them() -> void:
	for button: Button in _pad.find_children("*", "Button", true, false):
		assert_eq(button.focus_mode, Control.FOCUS_NONE, button.name)
