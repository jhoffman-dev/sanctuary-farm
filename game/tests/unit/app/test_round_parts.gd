## Direct tests of the pieces FarmGame is built from — round, feedback,
## sounds and the read models. The TypeScript suite reaches these only through
## the facade; here each is pinned on its own as well.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


func _served_round(plan: RoundPlan, scheduler: Dictionary, now: int) -> PracticeRound.Serving:
	var turn := PracticeRound.Turn.new()
	turn.active = PracticeRound.begin(plan, 100)
	turn.scheduler = scheduler
	turn.rng = SeededRng.new(1)
	turn.now = now
	return PracticeRound.serve_question(turn).value


func _graded(outcome: String, family_done: int = FactTuning.NO_FAMILY) -> GradedAnswer:
	var result := GradeResult.new()
	result.outcome = outcome
	result.correct = outcome != Outcome.WRONG
	result.correct_answer = 12
	result.family_just_mastered = family_done
	var graded := GradedAnswer.new()
	graded.question = Question.of(FactTable.get_fact("3x4"), 0)
	graded.result = result
	graded.given = 12
	graded.latency_ms = 900
	graded.asked_at = 7
	return graded


# ─── PracticeRound ───

func test_serving_puts_one_question_in_flight_and_advances_the_scheduler() -> void:
	var serving := _served_round(RoundPresets.paddock(), Fixtures.fresh(), 250)
	var in_flight := serving.active.in_flight
	assert_true(is_same(in_flight.question, serving.question))
	assert_eq([in_flight.served_at, in_flight.asked_at, serving.question.index], [250, 0, 0])
	assert_eq(serving.scheduler.last_served, serving.question.fact_id)
	assert_eq(serving.active.started_at, 100)


func test_a_family_round_serves_from_its_family() -> void:
	var serving := _served_round(RoundPlan.new(SessionContext.EGG, 3, 7), Fixtures.fresh(), 0)
	assert_eq(serving.question.family, 7)


func test_serving_from_an_unplayable_state_is_refused() -> void:
	var turn := PracticeRound.Turn.new()
	turn.active = PracticeRound.begin(RoundPresets.paddock(), 0)
	turn.scheduler = SchedulerState.with_changes(Fixtures.fresh(), {"facts": {}})
	turn.rng = SeededRng.new(1)
	assert_string_contains(PracticeRound.serve_question(turn).error, "no candidate facts")


func test_recording_an_answer_clears_the_flight_and_counts_toward_completion() -> void:
	var active := _served_round(RoundPlan.new(SessionContext.PADDOCK, 1), Fixtures.fresh(), 0).active
	assert_eq([PracticeRound.progress(active).asked, PracticeRound.is_complete(active)], [1, false])
	var answered := PracticeRound.record_answer(active, {"fact_id": "1x1"})
	assert_null(answered.in_flight)
	assert_true(PracticeRound.is_complete(answered))
	assert_eq(active.entries.size(), 0, "the round it came from is unchanged")


func test_a_round_copy_keeps_its_plan_and_start() -> void:
	var active := PracticeRound.begin(RoundPresets.paddock(), 42)
	var copy := active.with_turn(null, [{"fact_id": "2x2"}] as Array[Dictionary])
	assert_eq([copy.started_at, copy.entries.size()], [42, 1])
	assert_true(is_same(copy.plan, active.plan))


func test_the_session_log_drops_the_unanswered_question() -> void:
	var active := _served_round(RoundPlan.new(SessionContext.EGG, 4, 7), Fixtures.fresh(), 0).active
	var session_log := PracticeRound.session_log(PracticeRound.record_answer(active, {"asked_at": 0}), 900)
	assert_eq([session_log.started_at, session_log.ended_at, session_log.context, session_log.family], [100, 900, "egg", 7])
	assert_eq(session_log.entries, [{"asked_at": 0}])


# ─── AnswerFeedbacks and Sounds ───

func test_coins_are_earned_only_in_the_paddock_and_the_nest() -> void:
	var fluent := _graded(Outcome.FLUENT).result
	assert_eq(AnswerFeedbacks.coins_earned_for(SessionContext.PADDOCK, fluent), 2)
	assert_eq(AnswerFeedbacks.coins_earned_for(SessionContext.EGG, fluent), 2)
	assert_eq(AnswerFeedbacks.coins_earned_for(SessionContext.STALL, fluent), 0)
	assert_eq(AnswerFeedbacks.coins_earned_for(SessionContext.FREE, fluent), 0)


func test_a_session_entry_records_the_graded_answer() -> void:
	assert_eq(AnswerFeedbacks.session_entry_for(_graded(Outcome.SLOW)), {
		"fact_id": "3x4", "given": 12.0, "correct": true, "latency_ms": 900.0, "outcome": "SLOW", "asked_at": 7,
	})


func test_feedback_carries_the_grade_the_coins_and_the_next_question() -> void:
	var next := Question.of(FactTable.get_fact("5x5"), 1)
	var feedback := AnswerFeedbacks.feedback_for(_graded(Outcome.FLUENT, 4), 2, next)
	assert_eq([feedback.outcome, feedback.correct, feedback.correct_answer, feedback.coins_earned], [Outcome.FLUENT, true, 12, 2])
	assert_eq(feedback.family_just_mastered, 4)
	assert_true(is_same(feedback.next, next))
	assert_eq(feedback.sounds, [Sounds.FLUENT, Sounds.HATCH] as Array[String])


func test_each_outcome_has_its_sound() -> void:
	var sounds := Outcome.ALL.map(func(outcome: String) -> String: return Sounds.for_outcome(outcome))
	assert_eq(sounds, [Sounds.FLUENT, Sounds.CORRECT, Sounds.CORRECT, Sounds.WRONG])
	assert_eq(Sounds.for_graded(Outcome.WRONG, FactTuning.NO_FAMILY), [Sounds.WRONG] as Array[String])


# ─── read models ───

func test_a_question_shows_the_fact_and_its_place_in_the_round() -> void:
	var question := Question.of(FactTable.get_fact("7x8"), 3)
	assert_eq([question.fact_id, question.a, question.b, question.family, question.index], ["7x8", 7, 8, 8, 3])


func test_the_farm_summary_lists_the_families_in_play() -> void:
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(3), {"coins": 4})
	var summary := FarmSummary.of(farm)
	assert_eq([summary.coins, summary.feed, summary.muted], [4, Coins.STARTING_FEED, false])
	assert_eq(summary.families.map(func(f: Dictionary) -> int: return f.family), [1, 2, 3])


func test_arrival_outcomes_say_what_opened() -> void:
	var practice := ArrivalOutcome.practice(true)
	var soon := ArrivalOutcome.coming_soon("barn")
	assert_eq([practice.kind, practice.started], [ArrivalOutcome.PRACTICE, true])
	assert_eq([soon.kind, soon.place], [ArrivalOutcome.COMING_SOON, "barn"])


func test_a_care_order_travels_with_the_round_through_every_turn() -> void:
	var active := ActiveRound.new(RoundPresets.care(CareTask.WATER), 0)
	active.care = CareOrder.new("pig", CareTask.WATER)
	var next := active.with_turn(null, [{"fact_id": "2x3"}] as Array[Dictionary])
	assert_true(is_same(next.care, active.care))
	assert_null(ActiveRound.new(RoundPresets.paddock(), 0).with_turn(null, []).care)
