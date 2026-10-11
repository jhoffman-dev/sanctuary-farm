## Read-model: the question the pad shows. Plain values only, so scenes never
## hold a domain object.
class_name QuestionView
extends RefCounted

var a: int
var b: int


func _init(left: int, right: int) -> void:
	a = left
	b = right
