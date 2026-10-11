## A graded answer and the scheduler state after it.
class_name Graded
extends RefCounted

var result: GradeResult
var state: Dictionary


func _init(grade_result: GradeResult, graded_state: Dictionary) -> void:
	result = grade_result
	state = graded_state
