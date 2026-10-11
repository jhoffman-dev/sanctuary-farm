extends GutTest

const FakeClock := preload("res://tests/fakes/fake_clock.gd")
const InMemorySaveStore := preload("res://tests/fakes/in_memory_save_store.gd")
const Outcome := AnswerGrading.Outcome

var _store: InMemorySaveStore
var _clock: FakeClock
var _session: PracticeSession


func before_each() -> void:
	_store = InMemorySaveStore.new()
	_clock = FakeClock.new()
	_session = PracticeSession.new(_store, _clock, SeededRng.new(2026))


func _answer_correctly_after(msec: int) -> AnswerResult:
	var question := _session.next_question()
	_clock.advance(msec)
	return _session.submit_answer(question.a * question.b)


func test_a_new_farm_starts_with_no_coins() -> void:
	assert_eq(_session.start(), 0)


func test_a_saved_farm_starts_with_its_coins() -> void:
	_store.stored = FarmProgress.new(17, 9)
	assert_eq(_session.start(), 17)


func test_questions_come_from_the_12_table() -> void:
	_session.start()
	var question := _session.next_question()
	assert_between(question.a, 1, 12)
	assert_between(question.b, 1, 12)


func test_a_fast_right_answer_is_fluent_and_pays_two() -> void:
	_session.start()
	var result := _answer_correctly_after(1200)
	assert_true(result.correct)
	assert_eq(result.outcome, Outcome.FLUENT)
	assert_eq(result.coins_awarded, 2)
	assert_eq(result.total_coins, 2)


func test_a_slow_right_answer_pays_one() -> void:
	_session.start()
	var result := _answer_correctly_after(5000)
	assert_eq(result.outcome, Outcome.SLOW)
	assert_eq(result.coins_awarded, 1)


func test_a_wrong_answer_pays_nothing_and_shows_the_right_one() -> void:
	_session.start()
	var question := _session.next_question()
	var result := _session.submit_answer(question.a * question.b + 1)
	assert_false(result.correct)
	assert_eq(result.outcome, Outcome.WRONG)
	assert_eq(result.coins_awarded, 0)
	assert_eq(result.correct_answer, question.a * question.b)


func test_every_answer_is_saved_with_the_running_total() -> void:
	_store.stored = FarmProgress.new(10, 4)
	_session.start()
	var result := _answer_correctly_after(100)
	assert_true(result.saved)
	assert_eq(_store.save_count, 1)
	assert_eq(_store.stored.coins, 12)
	assert_eq(_store.stored.questions_answered, 5)


func test_a_refused_save_is_reported_and_the_loop_goes_on() -> void:
	_store.refuse_writes = true
	_session.start()
	var result := _answer_correctly_after(100)
	assert_false(result.saved)
	assert_eq(result.total_coins, 2)
	assert_not_null(_session.next_question())


func test_submitting_with_no_open_question_is_ignored() -> void:
	_session.start()
	assert_null(_session.submit_answer(4))
	assert_eq(_store.save_count, 0)


func test_a_double_submit_cannot_pay_twice() -> void:
	_session.start()
	var question := _session.next_question()
	_session.submit_answer(question.a * question.b)
	assert_null(_session.submit_answer(question.a * question.b))
	assert_eq(_store.stored.coins, 2)


func test_a_clock_that_ran_backwards_grades_slow_never_fluent() -> void:
	_session.start()
	_clock.now = 10000
	var question := _session.next_question()
	_clock.now = 4000
	var result := _session.submit_answer(question.a * question.b)
	assert_eq(result.outcome, Outcome.SLOW)


func test_the_same_fact_is_never_asked_twice_in_a_row() -> void:
	_session.start()
	var previous := ""
	for i in 200:
		var question := _session.next_question()
		var id := "%dx%d" % [question.a, question.b]
		assert_ne(id, previous, "question %d" % i)
		previous = id
		_session.submit_answer(0)


func test_the_same_seed_asks_the_same_questions() -> void:
	var other := PracticeSession.new(InMemorySaveStore.new(), FakeClock.new(), SeededRng.new(2026))
	_session.start()
	other.start()
	for i in 20:
		var mine := _session.next_question()
		var theirs := other.next_question()
		assert_eq([mine.a, mine.b], [theirs.a, theirs.b], "question %d" % i)
		_session.submit_answer(0)
		other.submit_answer(0)
