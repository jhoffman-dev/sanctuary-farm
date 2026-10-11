## One multiplication fact, a × b. Operands are ordered: 7 × 8 and 8 × 7 are
## distinct facts, as in the TypeScript domain.
class_name Fact
extends RefCounted

var a: int
var b: int

## "7x8" — the TypeScript domain's FactId format, so saves and ported tests line up.
var id: String:
	get:
		return "%dx%d" % [a, b]

var answer: int:
	get:
		return a * b


func _init(left: int, right: int) -> void:
	a = left
	b = right
