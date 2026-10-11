## The nest's rules — the prototype's `NestScreen` egg list and `claimHatch`,
## made pure. One egg per multiplication family, hatching into that family's
## animal (curriculum.md §4). An egg's progress is the family's progress
## (Mastery), so only graded, latency-weighted answers move it (game rules 2
## and 3); nothing about an egg is saved except the animal it hatches into.
## The numbers and their sources are in docs/nest.md.
class_name Nest
extends RefCounted

const UNKNOWN_EGG := "unknown-egg"
## The egg's family is mastered: it is waiting to hatch, not to be practised.
const READY_TO_HATCH := "egg-ready-to-hatch"
## Hatching waits for mastery.
const NOT_READY := "egg-not-ready"

## The animal each family hatches into — prototype `creatures/definitions.ts`.
const FAMILY_SPECIES := {
	1: Species.CHICK,
	2: Species.DUCK,
	3: Species.RABBIT,
	4: Species.SHEEP,
	5: Species.PIG,
	6: Species.CAT,
	7: Species.DOG,
	8: Species.HORSE,
	9: Species.GOAT,
	10: Species.COW,
	11: Species.GOOSE,
	12: Species.DONKEY,
}


static func egg_id_for(family: int) -> String:
	return "egg-%d" % family


## The eggs in the nest, in family order. A family has an egg while its animal
## is not yet in the barn and at least one of its facts has been introduced —
## so eggs appear as practice reaches their families, and the families whose
## animals live in the barn from day one never have one.
static func eggs(farm: Dictionary) -> Array[Egg]:
	var found: Array[Egg] = []
	for family in _families_in_play(farm):
		var species: String = FAMILY_SPECIES[family]
		if not _in_barn(farm, species) and _has_introduced_fact(farm.scheduler, family):
			found.append(Egg.new(family, species))
	return found


## The egg with this id, or UNKNOWN_EGG (never laid, already hatched, or not an egg).
static func find_egg(farm: Dictionary, egg_id: Variant) -> Result:
	if not egg_id is String:
		return Result.failure(UNKNOWN_EGG)
	for egg in eggs(farm):
		if egg.id == egg_id:
			return Result.success(egg)
	return Result.failure(UNKNOWN_EGG)


## 0..1, and 1.0 only once the family is mastered (Mastery.family_progress).
static func progress(farm: Dictionary, egg: Egg) -> float:
	return Mastery.family_progress(farm.scheduler, egg.family)


static func is_ready_to_hatch(farm: Dictionary, egg: Egg) -> bool:
	return Mastery.is_family_mastered(farm.scheduler, egg.family)


## The egg to practise, or why not: UNKNOWN_EGG, or READY_TO_HATCH.
static func check_practice(farm: Dictionary, egg_id: Variant) -> Result:
	var found := find_egg(farm, egg_id)
	if found.ok and is_ready_to_hatch(farm, found.value):
		return Result.failure(READY_TO_HATCH)
	return found


## The first egg in family order that is ready to hatch, or null.
static func next_to_hatch(farm: Dictionary) -> Egg:
	for egg in eggs(farm):
		if is_ready_to_hatch(farm, egg):
			return egg
	return null


## The farm with the egg hatched: its animal joins the barn as a new animal
## (id = its species), cared for under the barn's rules from then on, and the
## egg is gone. Refused, changing nothing, with UNKNOWN_EGG or NOT_READY.
static func hatch(farm: Dictionary, egg_id: Variant) -> Result:
	var found := find_egg(farm, egg_id)
	if not found.ok:
		return found
	var egg: Egg = found.value
	if not is_ready_to_hatch(farm, egg):
		return Result.failure(NOT_READY)
	var animals: Array = farm.animals.duplicate()
	animals.append(Barn.new_animal(egg.species, egg.species))
	return Result.success(FarmSave.with_changes(farm, {"animals": animals}))


## True once every family in play has its animal in the barn: the nest is
## empty for good, and practice carries on in the barn and paddock.
static func all_hatched(farm: Dictionary) -> bool:
	for family in _families_in_play(farm):
		if not _in_barn(farm, FAMILY_SPECIES[family]):
			return false
	return true


## Ids of the animals that hatched from the nest (not there on day one), in barn order.
static func hatched_animal_ids(farm: Dictionary) -> Array[String]:
	var ids: Array[String] = []
	for animal: Dictionary in farm.animals:
		if not Species.STARTING.has(animal.species):
			ids.append(animal.id)
	return ids


static func _families_in_play(farm: Dictionary) -> Array[int]:
	var families: Array[int] = []
	for family in FactTuning.ALL_FAMILIES:
		if family <= farm.scheduler.max_table:
			families.append(family)
	return families


static func _in_barn(farm: Dictionary, species: String) -> bool:
	return farm.animals.any(func(animal: Dictionary) -> bool: return animal.species == species)


static func _has_introduced_fact(scheduler: Dictionary, family: int) -> bool:
	return SchedulerCards.in_family(scheduler, family).any(func(card: Card) -> bool: return card.status.introduced)
