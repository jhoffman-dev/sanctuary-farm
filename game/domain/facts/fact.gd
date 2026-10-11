## One multiplication fact, a × b. Operands are ordered: 7 × 8 and 8 × 7 are
## distinct facts. Immutable: the table hands the same instances to every
## caller (SF-88), so writing a field is refused with an error.
class_name Fact
extends RefCounted

var a: int:
	get:
		return _a
	set(_ignored):
		_refuse_write("a")
var b: int:
	get:
		return _b
	set(_ignored):
		_refuse_write("b")
## "7x8" — the FactId format of the TypeScript domain and of the save file.
var id: String:
	get:
		return _id
	set(_ignored):
		_refuse_write("id")
var answer: int:
	get:
		return _a * _b
	set(_ignored):
		_refuse_write("answer")
## The larger operand. Decides which egg / animal the fact belongs to.
var family: int:
	get:
		return _family
	set(_ignored):
		_refuse_write("family")
## Introduction tier, 1 (Anchors) … 6 (The 12s).
var tier: int:
	get:
		return _tier
	set(_ignored):
		_refuse_write("tier")
## One of the facts kids most often stall on; over-sampled once introduced.
var hard_core: bool:
	get:
		return _hard_core
	set(_ignored):
		_refuse_write("hard_core")

var _a: int
var _b: int
var _id: String
var _family: int
var _tier: int
var _hard_core: bool


func _init(left: int, right: int) -> void:
	_a = left
	_b = right
	_id = FactTuning.fact_id(left, right)
	_family = FactTuning.family_of(left, right)
	_tier = FactTuning.tier_of(left, right)
	_hard_core = FactTuning.is_hard_core(_id)


func _refuse_write(field: String) -> void:
	push_error("Fact %s is immutable; refused a write to %s" % [_id, field])
