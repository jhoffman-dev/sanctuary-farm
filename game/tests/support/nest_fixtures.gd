## Farms whose families stand at a known point on the way to hatching. Every
## call returns a new farm.
extends RefCounted

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const MASTERED := {"box": FactTuning.MASTERY_BOX, "recent_latencies": [900, 900, 900]}
## One fluent answer from mastered: the next fluent grade promotes it to the
## mastery box with three fluent latencies.
const ONE_FLUENT_SHORT := {"box": FactTuning.MASTERY_BOX - 1, "recent_latencies": [900, 900]}


static func family_ids(family: int) -> Array[String]:
	return Fixtures.ids_of(FactTable.facts_in_family(family).value)


static func with_family(farm: Dictionary, family: int, patch: Dictionary) -> Dictionary:
	var scheduler := Fixtures.with_facts(farm.scheduler, family_ids(family), patch)
	return FarmSave.with_changes(farm, {"scheduler": scheduler})


static func mastered(farm: Dictionary, family: int) -> Dictionary:
	return with_family(farm, family, MASTERED)


## Every fact of the family mastered but its first, which is one fluent answer short.
static func one_answer_from_hatching(farm: Dictionary, family: int) -> Dictionary:
	var ready := mastered(farm, family)
	var scheduler := Fixtures.with_fact(ready.scheduler, family_ids(family)[0], ONE_FLUENT_SHORT)
	return FarmSave.with_changes(ready, {"scheduler": scheduler})


## A farm whose barn already holds the given species.
static func with_animals(farm: Dictionary, species: Array) -> Dictionary:
	var animals := species.map(func(kind: String) -> Dictionary: return Barn.new_animal(kind, kind))
	return FarmSave.with_changes(farm, {"animals": animals})
