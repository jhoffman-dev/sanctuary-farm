## The training ring's rules — the prototype's `TrainingScreen` (no quiz, no
## score), with each step typed on the pad instead of read (game rule 1).
## A wrong step is shown worked out and the strategy moves on (rule 6).
##
## Strategy steps are scaffolded, not recall: they never reach the scheduler,
## so they never promote, hold or drop a fact (rule 3), and the ring pays no
## coins and grows no egg (rule 2). The numbers and their sources are in
## docs/training-ring.md.
class_name TrainingRing
extends RefCounted

const UNKNOWN_FACT := "training-unknown-fact"
## a × 1 (other than 2 × 1) has no strategy: the ×1 rule is the whole story.
const NOTHING_TO_BREAK_DOWN := "training-nothing-to-break-down"
## Every step of the strategy is answered; another_way or leave.
const STRATEGY_DONE := "training-strategy-done"

## The facts the ring offers, in the prototype's order (`PRACTICE_FACTS`).
const PRACTICE_FACTS: Array[String] = ["6x7", "7x8", "6x8", "7x9", "8x9", "8x8", "7x7", "4x8", "6x6", "9x12"]


## PRACTICE_FACTS within the farm's table size.
static func offered_facts(max_table: int) -> Array[String]:
	var offered: Array[String] = []
	for fact_id in PRACTICE_FACTS:
		if _in_table(fact_id, max_table):
			offered.append(fact_id)
	return offered


## One of offered_facts, drawn with `rng` so "pick one for me" varies.
static func pick_fact(max_table: int, rng: Rng) -> Result:
	return Rng.weighted_pick(offered_facts(max_table), [], rng)


## Any fact of the farm's table may be trained, offered or not.
static func check_fact(fact_id: Variant, max_table: int) -> Result:
	if not fact_id is String or not _in_table(fact_id, max_table):
		return Result.failure(UNKNOWN_FACT)
	var fact := FactTable.get_fact(fact_id)
	if Strategies.for_fact(fact.a, fact.b).is_empty():
		return Result.failure(NOTHING_TO_BREAK_DOWN)
	return Result.success(fact)


## Starts on the fact's first strategy. Check the fact with check_fact first.
static func begin(fact: Fact) -> Training:
	return Training.new(fact, Strategies.for_fact(fact.a, fact.b))


## The step waiting for an answer, or null once the strategy is done.
static func current_step(training: Training) -> StrategyStep:
	var steps := training.strategy.steps
	return steps[training.worked.size()] if training.worked.size() < steps.size() else null


static func is_strategy_done(training: Training) -> bool:
	return current_step(training) == null


## The whole strategy worked with every step right first time.
static func all_correct(training: Training) -> bool:
	return is_strategy_done(training) and training.worked.all(func(done: WorkedStep) -> bool: return done.correct)


## Answers the current step; the value is the Training with it worked.
## Refused with STRATEGY_DONE once every step is answered.
static func answer_step(training: Training, given: float) -> Result:
	var step := current_step(training)
	if step == null:
		return Result.failure(STRATEGY_DONE)
	var answered := training.worked.duplicate()
	answered.append(WorkedStep.new(step, given))
	return Result.success(Training.new(training.fact, training.strategies, training.strategy_index, answered))


## The next strategy for the same fact, from its first step ("show me another
## way"); after the last it wraps to the first, so one strategy just restarts.
static func another_way(training: Training) -> Training:
	var next := (training.strategy_index + 1) % training.strategies.size()
	return Training.new(training.fact, training.strategies, next)


static func _in_table(fact_id: String, max_table: int) -> bool:
	var fact := FactTable.get_fact(fact_id)
	return fact != null and fact.a <= max_table and fact.b <= max_table
