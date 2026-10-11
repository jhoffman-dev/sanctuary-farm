## The number pad: shows a question, collects digits from taps or the keyboard,
## and emits the typed answer. It renders what it is given and decides nothing
## about the game — grading happens in FarmGame.
class_name NumberPad
extends PanelContainer

signal answer_submitted(value: int)

## Enough for 12 x 12 = 144, with room to mistype one more digit.
const MAX_DIGITS := 4

var _typed := ""

@onready var _question_label: Label = %QuestionLabel
@onready var _answer_label: Label = %AnswerLabel
@onready var _feedback_label: Label = %FeedbackLabel


func _ready() -> void:
	for digit in range(10):
		var key: Button = get_node("%%Digit%d" % digit)
		key.pressed.connect(_type_digit.bind(digit))
	%Backspace.pressed.connect(_erase_digit)
	%Enter.pressed.connect(_submit)
	_refresh_answer()


func show_question(question: Question) -> void:
	_question_label.text = "%d × %d" % [question.a, question.b]
	_typed = ""
	_refresh_answer()


## Feedback stays gentle: a right answer is celebrated, a wrong one just shows
## the fact and moves on. No red, no buzzer, no "wrong".
func show_result(feedback: AnswerFeedback) -> void:
	var question := feedback.question
	var fact := "%d × %d = %d" % [question.a, question.b, feedback.correct_answer]
	if feedback.correct:
		_feedback_label.text = "Yes! %s  (+%d)" % [fact, feedback.coins_earned]
	else:
		_feedback_label.text = "%s — you'll get it next time." % fact


func _unhandled_input(event: InputEvent) -> void:
	var key := event as InputEventKey
	if key == null or not key.pressed or key.echo:
		return
	var digit := _digit_for(key.keycode)
	if digit >= 0:
		_type_digit(digit)
	elif key.keycode == KEY_BACKSPACE:
		_erase_digit()
	elif key.keycode == KEY_ENTER or key.keycode == KEY_KP_ENTER:
		_submit()
	else:
		return
	get_viewport().set_input_as_handled()


static func _digit_for(keycode: Key) -> int:
	if keycode >= KEY_0 and keycode <= KEY_9:
		return keycode - KEY_0
	if keycode >= KEY_KP_0 and keycode <= KEY_KP_9:
		return keycode - KEY_KP_0
	return -1


func _type_digit(digit: int) -> void:
	if _typed.length() < MAX_DIGITS:
		_typed += str(digit)
		_refresh_answer()


func _erase_digit() -> void:
	_typed = _typed.left(-1)
	_refresh_answer()


func _submit() -> void:
	if _typed.is_empty():
		return
	answer_submitted.emit(int(_typed))


func _refresh_answer() -> void:
	_answer_label.text = _typed if not _typed.is_empty() else "?"
