## A fact paired with its learning state — the unit the scheduler reasons about.
class_name Card
extends RefCounted

var fact: Fact
## The fact's FactState dictionary.
var status: Dictionary


func _init(card_fact: Fact, card_status: Dictionary) -> void:
	fact = card_fact
	status = card_status
