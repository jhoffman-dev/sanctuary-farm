## One egg in the nest: a multiplication family and the animal it hatches into.
class_name Egg
extends RefCounted

## Stable for the life of the farm: "egg-<family>".
var id: String
var family: int
## The Species that hatches from it.
var species: String


func _init(egg_family: int, hatches_into: String) -> void:
	id = Nest.egg_id_for(egg_family)
	family = egg_family
	species = hatches_into
