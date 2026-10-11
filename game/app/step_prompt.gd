## Read-model: a strategy step as the pad shows it — `left op right = ?`. The
## answer is not here: the scene cannot show it before the child types.
class_name StepPrompt
extends RefCounted

var left: int
## A StrategyStep op: TIMES, PLUS, MINUS, or DOUBLE ("double `left`").
var op: String
var right: int


static func of(step: StrategyStep) -> StepPrompt:
	var prompt := StepPrompt.new()
	prompt.left = step.left
	prompt.op = step.op
	prompt.right = step.right
	return prompt
