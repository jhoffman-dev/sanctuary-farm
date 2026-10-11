## One step of a strategy: a smaller sum the child types the answer to on the
## pad — `7 × 5`, `35 + 21`, `70 − 14`, `double 28`. Never edited in place.
class_name StrategyStep
extends RefCounted

const TIMES := "times"
const PLUS := "plus"
const MINUS := "minus"
## "double `left`": the scene says "double"; the sum is `left` × 2 (`right` is 2).
const DOUBLE := "double"

var left: int
var op: String
var right: int
## What the child should type. Kept out of every read-model until answered.
var answer: int:
	get:
		match op:
			PLUS:
				return left + right
			MINUS:
				return left - right
			_:
				return left * right


func _init(left_operand: int, operation: String, right_operand: int) -> void:
	left = left_operand
	op = operation
	right = right_operand


static func times(left_operand: int, right_operand: int) -> StrategyStep:
	return StrategyStep.new(left_operand, TIMES, right_operand)


static func plus(left_operand: int, right_operand: int) -> StrategyStep:
	return StrategyStep.new(left_operand, PLUS, right_operand)


static func minus(left_operand: int, right_operand: int) -> StrategyStep:
	return StrategyStep.new(left_operand, MINUS, right_operand)


static func double(left_operand: int) -> StrategyStep:
	return StrategyStep.new(left_operand, DOUBLE, 2)
