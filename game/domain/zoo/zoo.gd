## The petting zoo by the pond — the prototype's `CreatureHome` and
## `moveAnimal`, made pure. Every animal lives in one place, its `home`:
## the barn or the zoo. Moving one is play, not progress, so it costs and
## earns nothing and asks no question (game rule 2). A visiting animal is
## still the keeper's to care for: the barn's care, health and decay rules
## apply wherever it lives (Barn). The numbers and their sources are in
## docs/petting-zoo.md.
class_name Zoo
extends RefCounted

const BARN := "barn"
const ZOO := "zoo"
const HOMES: Array[String] = [BARN, ZOO]
## The most animals visiting at once. The prototype set no limit, so this is
## every animal a farm can own (one per species): the zoo never turns one away
## until it is tuned down.
const CAPACITY := 12

const UNKNOWN_HOME := "unknown-home"
## Not a failure: the animal is already where it was asked to go.
const ALREADY_THERE := "already-there"
## Gentle: "the zoo has no room — bring someone back to the barn first".
const ZOO_FULL := "zoo-full"


static func visitors(farm: Dictionary) -> Array:
	return _living_at(farm.animals, ZOO)


static func in_barn(farm: Dictionary) -> Array:
	return _living_at(farm.animals, BARN)


static func is_full(farm: Dictionary) -> bool:
	return visitors(farm).size() >= CAPACITY


## True when no more than CAPACITY of `animals` are in the zoo.
static func within_capacity(animals: Array) -> bool:
	return _living_at(animals, ZOO).size() <= CAPACITY


## The animal that may move to `home`, or why not: UNKNOWN_HOME,
## Barn.UNKNOWN_ANIMAL, ALREADY_THERE, or ZOO_FULL (only on the way in — the barn
## always has room to take an animal back).
static func check_move(farm: Dictionary, animal_id: Variant, home: Variant) -> Result:
	if not home is String or not HOMES.has(home):
		return Result.failure(UNKNOWN_HOME)
	var index := _index_of(farm.animals, animal_id)
	if index < 0:
		return Result.failure(Barn.UNKNOWN_ANIMAL)
	var animal: Dictionary = farm.animals[index]
	if animal.home == home:
		return Result.failure(ALREADY_THERE)
	if home == ZOO and is_full(farm):
		return Result.failure(ZOO_FULL)
	return Result.success(animal)


## The farm with the animal living at `home`, its care untouched. Refused,
## changing nothing, for anything check_move refuses.
static func move(farm: Dictionary, animal_id: Variant, home: Variant) -> Result:
	var checked := check_move(farm, animal_id, home)
	if not checked.ok:
		return checked
	var animal: Dictionary = checked.value.duplicate(true)
	animal.home = home
	var animals: Array = farm.animals.duplicate()
	animals[_index_of(animals, animal_id)] = animal
	return Result.success(FarmSave.with_changes(farm, {"animals": animals}))


## The other place: where an animal at `home` would move to.
static func other_home(home: String) -> String:
	return BARN if home == ZOO else ZOO


static func _living_at(animals: Array, home: String) -> Array:
	return animals.filter(func(animal: Dictionary) -> bool: return animal.home == home)


static func _index_of(animals: Array, animal_id: Variant) -> int:
	if not animal_id is String:
		return -1
	for i in animals.size():
		if animals[i].id == animal_id:
			return i
	return -1
