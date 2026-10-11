## Read-model: the training ring's fact and strategy as the scene draws them.
## Numbers only; the scene writes the words and draws the grid.
class_name TrainingSummary
extends RefCounted

var fact_id: String
var a: int
var b: int
## The Strategy key being worked.
var strategy: String
## Every Strategy key for this fact, in order; "another way" moves along it.
var strategies: Array[String] = []
## The numbers for the strategy's sentence (Strategy.hint).
var hint: Dictionary
## The area model the prototype drew for every strategy: `rows` × `cols`
## (a × b), split before column `split_at` (0: b does not split).
var rows: int
var cols: int
var split_at: int
var step_count: int
## The step waiting for the pad, or null once the strategy is done.
var current_step: StepPrompt
## The steps answered so far, worked out.
var worked: Array[WorkedStepSummary] = []
var done: bool
## Done with every step right first time.
var all_correct: bool


static func of(training: Training) -> TrainingSummary:
	var summary := TrainingSummary.new()
	summary.fact_id = training.fact.id
	summary.a = training.fact.a
	summary.b = training.fact.b
	summary.strategy = training.strategy.key
	for way in training.strategies:
		summary.strategies.append(way.key)
	summary.hint = training.strategy.hint.duplicate(true)
	summary.rows = training.fact.a
	summary.cols = training.fact.b
	var split := Strategies.area_split(training.fact.b)
	summary.split_at = split[0] if not split.is_empty() else 0
	summary.step_count = training.strategy.steps.size()
	var step := TrainingRing.current_step(training)
	summary.current_step = StepPrompt.of(step) if step != null else null
	for answered in training.worked:
		summary.worked.append(WorkedStepSummary.of_worked(answered))
	summary.done = TrainingRing.is_strategy_done(training)
	summary.all_correct = TrainingRing.all_correct(training)
	return summary
