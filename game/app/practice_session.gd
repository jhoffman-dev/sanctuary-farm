## Use-case: the placeholder practice loop — ask a fact, grade the answer by
## correctness and latency, award coins, save. Scenes call this and render what
## it returns; they never decide what comes next.
class_name PracticeSession
extends RefCounted

var _facts: Array[Fact]
var _save_store: SaveStore
var _clock: Clock
var _rng: Rng
var _progress: FarmProgress
var _current: Fact = null
var _previous_id := ""
var _asked_at_msec := 0


func _init(save_store: SaveStore, clock: Clock, rng: Rng) -> void:
	_save_store = save_store
	_clock = clock
	_rng = rng
	_facts = FactTable.build(FactTable.MAX_TABLE)
	_progress = FarmProgress.new()


## Loads saved progress (or starts fresh) and returns the coin count to show.
func start() -> int:
	var loaded := _save_store.load_progress()
	_progress = loaded if loaded != null else FarmProgress.new()
	return _progress.coins


## Picks the next fact and starts its latency timer.
func next_question() -> QuestionView:
	_current = QuestionPicker.pick(_facts, _previous_id, _rng)
	_asked_at_msec = _clock.now_msec()
	return QuestionView.new(_current.a, _current.b)


## Grades the current question. Returns null when no question is open, so a
## double submit cannot pay twice.
func submit_answer(given: int) -> AnswerResult:
	if _current == null:
		return null
	var correct := given == _current.answer
	var outcome := AnswerGrading.classify(correct, _latency_msec())
	_progress = _progress.with_answer(outcome)
	var result := AnswerResult.new()
	result.correct = correct
	result.outcome = outcome
	result.correct_answer = _current.answer
	result.coins_awarded = AnswerGrading.coins_for(outcome)
	result.total_coins = _progress.coins
	result.saved = _save_store.save_progress(_progress) == OK
	_previous_id = _current.id
	_current = null
	return result


## A clock that ran backwards grades as SLOW (never FLUENT), as in the
## TypeScript application.
func _latency_msec() -> int:
	var elapsed := _clock.now_msec() - _asked_at_msec
	return elapsed if elapsed >= 0 else AnswerGrading.FLUENT_MAX_MS
