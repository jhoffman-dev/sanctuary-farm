## The scheduler's choice: the fact to ask and the state that records the asking.
class_name Served
extends RefCounted

var fact: Fact
var state: Dictionary


func _init(served_fact: Fact, served_state: Dictionary) -> void:
	fact = served_fact
	state = served_state
