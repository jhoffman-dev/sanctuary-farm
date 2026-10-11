## The barn's animals inside a save — FarmSaveCodec's helper for the v4 field.
## Parse, don't trust: an animal the rules could not have written (an unknown
## species, health outside FLOOR..MAX, a missing task, a repeated id, a
## second animal of one species — each family hatches once, a home that is
## neither the barn nor the zoo, more visitors than the zoo holds) makes the
## whole list null, and each record is rebuilt from checked values. An animal
## saved before the petting zoo has no `home`: it lives in the barn, so those
## v4 saves load unchanged, and the schema version stays 4.
class_name AnimalsCodec
extends RefCounted

## Day numbers count days since 1970; past the last day a JSON number holds exactly, none is real.
const MAX_DAY := 104_249_991  # (2^53 - 1) ms / CareDay.MSEC_PER_DAY


## The animals in `value`, or null when it is not a list the game could have written.
static func parse(value: Variant) -> Variant:
	if not value is Array:
		return null
	var animals := []
	var ids := {}
	var species := {}
	for item: Variant in value:
		var animal: Variant = _animal(item)
		if animal == null or ids.has(animal.id) or species.has(animal.species):
			return null
		ids[animal.id] = true
		species[animal.species] = true
		animals.append(animal)
	return animals if Zoo.within_capacity(animals) else null


static func _animal(value: Variant) -> Variant:
	if not value is Dictionary:
		return null
	var id: Variant = value.get("id")
	var species: Variant = value.get("species")
	var health: Variant = FactTuning.whole_number(value.get("health"))
	var done: Variant = _done(value.get("done"))
	var home: Variant = value.get("home", Zoo.BARN)
	if not id is String or id.is_empty() or not species is String or not Species.ALL.has(species):
		return null
	if health == null or health < AnimalHealth.FLOOR or health > AnimalHealth.MAX or done == null:
		return null
	if not home is String or not Zoo.HOMES.has(home):
		return null
	return {"id": id, "species": species, "home": home, "health": health, "done": done}


## Exactly one entry per care task, each a day number or null; built in
## CareTask order so a reloaded farm encodes to the same text.
static func _done(value: Variant) -> Variant:
	if not value is Dictionary or value.size() != CareTask.ALL.size():
		return null
	var done := {}
	for task in CareTask.ALL:
		if not value.has(task):
			return null
		var day: Variant = value[task]
		if day == null:
			done[task] = null
			continue
		day = FactTuning.whole_number(day)
		if day == null or day < 0 or day > MAX_DAY:
			return null
		done[task] = day
	return done
