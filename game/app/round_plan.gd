## What a round asks for. `questions` and `family` are Variants so a caller's
## mistake (a fraction, NaN) reaches FarmGame's validation and is refused there.
class_name RoundPlan
extends RefCounted

## A SessionContext string.
var context: String
## A whole number >= 1.
var questions: Variant
## The family to practise, or null. Required for egg and stall rounds.
var family: Variant


func _init(round_context: String, question_count: Variant, practised_family: Variant = null) -> void:
	context = round_context
	questions = question_count
	family = practised_family
