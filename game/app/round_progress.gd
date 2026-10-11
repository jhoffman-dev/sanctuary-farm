## Read-model: how far through its round the game is.
class_name RoundProgress
extends RefCounted

## Questions served so far, including the one in flight.
var asked: int
var total: int
## Every planned question has been answered.
var complete: bool


func _init(asked_count: int = 0, planned: int = 0, all_answered: bool = false) -> void:
	asked = asked_count
	total = planned
	complete = all_answered
