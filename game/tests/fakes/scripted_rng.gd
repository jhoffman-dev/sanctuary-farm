## An Rng that returns the given values in order, then repeats the last one.
extends Rng

var _values: Array[float]
var _next := 0


func _init(values: Array[float]) -> void:
	_values = values


func next_float() -> float:
	var value := _values[mini(_next, _values.size() - 1)]
	_next += 1
	return value
