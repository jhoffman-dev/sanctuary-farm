## Read-model: the petting zoo by the pond as its scene renders it — who is
## visiting, who could come over from the barn, how much room is left, and
## which moves would be accepted now.
class_name ZooSummary
extends RefCounted

## The animals visiting the zoo, in farm order; each one's move is back to the barn.
var visitors: Array[ZooAnimal] = []
## The animals in the barn, in farm order; each one's move is into the zoo.
var in_barn: Array[ZooAnimal] = []
var capacity: int = Zoo.CAPACITY
var places_left: int
var is_full: bool
## Why no animal may move now (PlaySession.GOODNIGHT or
## FarmGame.ROUND_IS_ACTIVE), or empty while the zoo is open.
var closed_because: String


## `closed_because` is empty while moves are allowed.
static func of(farm: Dictionary, today: int, closed_because: String) -> ZooSummary:
	var summary := ZooSummary.new()
	summary.closed_because = closed_because
	for animal: Dictionary in farm.animals:
		var entry := ZooAnimal.of(AnimalSummary.of(animal, today), _refusal(farm, animal, closed_because))
		if animal.home == Zoo.ZOO:
			summary.visitors.append(entry)
		else:
			summary.in_barn.append(entry)
	summary.places_left = maxi(0, Zoo.CAPACITY - summary.visitors.size())
	summary.is_full = Zoo.is_full(farm)
	return summary


## Why this animal may not move to the other place now, or empty when it may.
static func _refusal(farm: Dictionary, animal: Dictionary, closed_because: String) -> String:
	if not closed_because.is_empty():
		return closed_because
	var allowed := Zoo.check_move(farm, animal.id, Zoo.other_home(animal.home))
	return "" if allowed.ok else allowed.error
