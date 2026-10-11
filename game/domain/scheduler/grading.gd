## Grading one answer — `scheduler/grade.ts`.
class_name Grading
extends RefCounted


## Where an answered fact goes next.
class _Placement:
	var outcome: String
	var box: int
	var due_at: int


## The states either side of one grade, for describing what it changed.
class _Transition:
	var card: Card
	var outcome: String
	var before: Dictionary
	var after: Dictionary


## Grade one answer: classify by latency, move the Leitner box, re-queue, credit
## the commutative twin, and unlock tiers. Refuses, before touching the state, a
## fact the state does not know or never introduced and a latency that is not a
## finite duration — the application grades only the fact it has in flight,
## with a clock it has already clamped. The value is a Graded.
static func grade_answer(state: Dictionary, answer: Answer) -> Result:
	var latency := Latency.check(answer.latency_ms)
	if not latency.ok:
		return latency
	var found := _require_card(state, answer.fact_id)
	if not found.ok:
		return found
	var card: Card = found.value
	var correct := answer.given == card.fact.answer
	var placement := _placement(state, card, Latency.classify_outcome(correct, answer.latency_ms))

	var counted := SchedulerState.with_changes(state, {"global_counter": state.global_counter + 1})
	var attempted := SchedulerState.with_status(counted, _record_attempt(card.status, answer, placement))
	var credited := CommuteCredit.credit_twin(attempted, card.fact) if correct else attempted
	var after := TierUnlock.with_unlocked_tiers(credited, SchedulerCards.in_play(credited))

	var transition := _Transition.new()
	transition.card = card
	transition.outcome = placement.outcome
	transition.before = state
	transition.after = after
	return Result.success(Graded.new(_describe(transition), after))


## Only an introduced fact can be graded: grading one at box 0 would leave it
## boxed but not introduced, and the scheduler only ever serves introduced facts.
static func _require_card(state: Dictionary, fact_id: String) -> Result:
	var fact := FactTable.get_fact(fact_id)
	var status: Variant = state.facts.get(fact_id)
	if fact == null or status == null:
		return Result.failure('grade_answer: unknown fact "%s"' % fact_id)
	if not status.introduced:
		return Result.failure('grade_answer: fact "%s" was never introduced' % fact_id)
	return Result.success(Card.new(fact, status))


static func _placement(state: Dictionary, card: Card, outcome: String) -> _Placement:
	var placement := _Placement.new()
	placement.outcome = outcome
	placement.box = Leitner.box_after(outcome, card.status.box)
	placement.due_at = state.global_counter + 1 + Leitner.requeue_interval(outcome, placement.box)
	return placement


static func _record_attempt(status: Dictionary, answer: Answer, placement: _Placement) -> Dictionary:
	var correct := placement.outcome != Outcome.WRONG
	var recent: Array = status.recent_latencies.duplicate()
	recent.append(answer.latency_ms)
	return FactState.patched(status, {
		"box": placement.box,
		"due_at": placement.due_at,
		"last_latency_ms": answer.latency_ms,
		"recent_latencies": recent.slice(-FactTuning.MAX_RECENT_LATENCIES),
		"correct_streak": status.correct_streak + 1 if correct else 0,
		"total_attempts": status.total_attempts + 1,
		"total_correct": status.total_correct + 1 if correct else status.total_correct,
	})


static func _describe(transition: _Transition) -> GradeResult:
	var fact := transition.card.fact
	var previous := transition.card.status
	var graded: Variant = transition.after.facts.get(fact.id)
	var family_was_mastered := Mastery.is_family_mastered(transition.before, fact.family)
	var result := GradeResult.new()
	result.outcome = transition.outcome
	result.correct = transition.outcome != Outcome.WRONG
	result.fact = fact
	result.correct_answer = fact.answer
	result.previous_box = previous.box
	result.new_box = graded.box if graded != null else previous.box
	result.fact_mastered = not Mastery.is_fact_mastered(previous) and Mastery.is_fact_mastered(graded)
	var family_now_mastered := Mastery.is_family_mastered(transition.after, fact.family)
	result.family_just_mastered = (
		fact.family if not family_was_mastered and family_now_mastered else FactTuning.NO_FAMILY
	)
	return result
