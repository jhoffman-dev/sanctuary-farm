## The rules of one practice round — `round.ts`: one question in flight,
## answers logged, the round done after its planned number of questions.
class_name PracticeRound
extends RefCounted


## What serving the next question needs.
class Turn:
	var active: ActiveRound
	var scheduler: Dictionary
	var rng: Rng
	var now: int


## A round and the scheduler state after serving its next question.
class Serving:
	var active: ActiveRound
	var scheduler: Dictionary
	var question: Question


static func begin(plan: RoundPlan, started_at: int) -> ActiveRound:
	return ActiveRound.new(plan, started_at)


## Ask the scheduler for exactly one fact and put it in flight. The value is a
## Serving; a refusal is the scheduler's (a state with nothing to serve).
static func serve_question(turn: Turn) -> Result:
	var picked := _pick_fact(turn.active.plan, turn.scheduler, turn.rng)
	if not picked.ok:
		return picked
	var served: Served = picked.value
	var question := Question.of(served.fact, turn.active.entries.size())
	var serving := Serving.new()
	var in_flight := InFlight.new(question, turn.now, served.state.global_counter)
	serving.active = turn.active.with_turn(in_flight, turn.active.entries)
	serving.scheduler = served.state
	serving.question = question
	return Result.success(serving)


static func record_answer(active: ActiveRound, entry: Dictionary) -> ActiveRound:
	var entries := active.entries.duplicate()
	entries.append(entry)
	return active.with_turn(null, entries)


static func is_complete(active: ActiveRound) -> bool:
	return active.entries.size() >= active.plan.questions


static func progress(active: ActiveRound) -> RoundProgress:
	var asked := active.entries.size() + (1 if active.in_flight != null else 0)
	return RoundProgress.new(asked, active.plan.questions, is_complete(active))


## An unanswered in-flight question is simply dropped — only graded answers are logged.
static func session_log(active: ActiveRound, ended_at: int) -> Dictionary:
	return {
		"started_at": active.started_at,
		"ended_at": ended_at,
		"context": active.plan.context,
		"family": active.plan.family,
		"entries": active.entries.duplicate(),
	}


static func _pick_fact(plan: RoundPlan, scheduler: Dictionary, rng: Rng) -> Result:
	if plan.family == null:
		return NextFact.pick(scheduler, rng)
	return NextFact.pick_in_family(scheduler, plan.family, rng)
