## Which animal gets which care task — what a care round is played for.
class_name CareOrder
extends RefCounted

var animal_id: String
## A CareTask.
var task: String


func _init(for_animal: String, care_task: String) -> void:
	animal_id = for_animal
	task = care_task
