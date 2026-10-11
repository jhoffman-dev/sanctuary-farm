## A step the child has answered: the step (its answer now shown) and what
## she typed. A wrong answer is shown worked out and the strategy moves on.
class_name WorkedStep
extends RefCounted

var step: StrategyStep
var given: float
var correct: bool


func _init(answered: StrategyStep, typed: float) -> void:
	step = answered
	given = typed
	correct = typed == step.answer
