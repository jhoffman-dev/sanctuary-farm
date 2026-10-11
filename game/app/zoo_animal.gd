## Read-model: one animal as the petting zoo scene lists it — the animal, and
## whether it may move to the other place now.
class_name ZooAnimal
extends RefCounted

var animal: AnimalSummary
## True when FarmGame.move_to_zoo (for a barn animal) or move_to_barn (for a
## visitor) would be accepted now.
var can_move: bool
## Why not, when can_move is false: PlaySession.GOODNIGHT,
## FarmGame.ROUND_IS_ACTIVE or Zoo.ZOO_FULL. Empty when it can move.
var why_not: String


static func of(animal_summary: AnimalSummary, refusal: String) -> ZooAnimal:
	var entry := ZooAnimal.new()
	entry.animal = animal_summary
	entry.can_move = refusal.is_empty()
	entry.why_not = refusal
	return entry
