## A visit to the training ring in progress: one fact, the strategies that
## break it down, the one being worked, and its steps answered so far. Never
## edited in place: TrainingRing returns a copy.
class_name Training
extends RefCounted

var fact: Fact
var strategies: Array[Strategy] = []
## Index into strategies of the one being worked.
var strategy_index: int
## The current strategy's answered steps, in order.
var worked: Array[WorkedStep] = []

var strategy: Strategy:
	get:
		return strategies[strategy_index]


func _init(trained: Fact, ways: Array[Strategy], index: int = 0, answered: Array[WorkedStep] = []) -> void:
	fact = trained
	strategies = ways
	strategy_index = index
	worked = answered
