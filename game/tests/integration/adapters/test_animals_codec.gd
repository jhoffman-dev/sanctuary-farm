## The v4 barn field through FarmSaveCodec (AnimalsCodec): round-trip through
## real JSON text, the v3 -> v4 migration, and every impossible animal refused.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const DAY := 20_000


func _cared_farm() -> Dictionary:
	var farm := Fixtures.fresh_farm()
	farm = Barn.apply_care(farm, CareOrder.new("pig", CareTask.FEED), DAY).value
	return Barn.apply_care(farm, CareOrder.new("chick", CareTask.PLAY), DAY + 1).value


func _raw(farm: Dictionary) -> Dictionary:
	return JSON.parse_string(FarmSaveCodec.encode(farm))


func _with_animal(index: int, changes: Dictionary) -> Dictionary:
	var raw := _raw(Fixtures.fresh_farm())
	raw.animals[index].merge(changes, true)
	return raw


func test_round_trips_cared_for_animals_exactly() -> void:
	var farm := _cared_farm()
	assert_eq(FarmSaveCodec.decode(FarmSaveCodec.encode(farm)), farm)


func test_round_trips_animals_hatched_from_the_nest() -> void:
	var farm := Fixtures.fresh_farm()
	var ids := Fixtures.ids_of(FactTable.facts_in_family(2).value)
	var mastered := Fixtures.with_facts(farm.scheduler, ids, {"box": FactTuning.MASTERY_BOX, "recent_latencies": [900.0, 900.0, 900.0]})
	farm = Nest.hatch(FarmSave.with_changes(farm, {"scheduler": mastered}), "egg-2").value
	farm = Barn.apply_care(farm, CareOrder.new("duck", CareTask.FEED), DAY).value
	var loaded: Dictionary = FarmSaveCodec.decode(FarmSaveCodec.encode(farm))
	assert_eq(loaded, farm)
	assert_eq(Nest.hatched_animal_ids(loaded), ["duck"] as Array[String])
	assert_eq(Nest.eggs(loaded), [] as Array[Egg], "a hatched egg stays hatched after a reload")


func test_every_species_loads() -> void:
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(), {
		"animals": Species.ALL.map(func(kind: String) -> Dictionary: return Barn.new_animal(kind, kind)),
	})
	assert_eq(FarmSaveCodec.decode(FarmSaveCodec.encode(farm)), farm)


func test_health_and_days_come_back_as_ints() -> void:
	var loaded: Dictionary = FarmSaveCodec.decode(FarmSaveCodec.encode(_cared_farm()))
	assert_eq(typeof(loaded.animals[1].health), TYPE_INT)
	assert_eq(typeof(loaded.animals[1].done[CareTask.FEED]), TYPE_INT)


func test_a_v3_save_loads_with_the_starting_animals_and_its_progress_kept() -> void:
	var raw := _raw(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 9, "feed": 4}))
	raw.schema_version = 3
	raw.erase("animals")
	var migrated: Dictionary = FarmSaveCodec.parse_farm_save(raw)
	assert_eq(migrated.schema_version, FarmSave.SCHEMA_VERSION)
	assert_eq(migrated.animals, Barn.starting_animals())
	assert_eq([migrated.coins, migrated.feed], [9, 4])


func test_a_v3_save_ignores_any_animals_it_carries() -> void:
	var raw := _raw(_cared_farm())
	raw.schema_version = 3
	assert_eq(FarmSaveCodec.parse_farm_save(raw).animals, Barn.starting_animals())


func test_an_empty_barn_is_a_barn() -> void:
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(), {"animals": []})
	assert_eq(FarmSaveCodec.decode(FarmSaveCodec.encode(farm)), farm)


func test_drops_keys_an_animal_does_not_have() -> void:
	var raw := _with_animal(0, {"name": "Daisy", "sick": true})
	assert_eq(FarmSaveCodec.parse_farm_save(raw), Fixtures.fresh_farm())


func test_rejects_every_impossible_barn() -> void:
	var no_play: Dictionary = Barn.new_animal("cow", Species.COW).done
	no_play.erase(CareTask.PLAY)
	var extra_task: Dictionary = Barn.new_animal("cow", Species.COW).done
	extra_task["groom"] = null
	var missing_animals := _raw(Fixtures.fresh_farm())
	missing_animals.erase("animals")
	var twin := _raw(Fixtures.fresh_farm())
	twin.animals[1].id = "cow"
	var second_cow := _raw(Fixtures.fresh_farm())
	second_cow.animals[1].species = Species.COW
	var cases := {
		"a v4 save without animals": missing_animals,
		"two animals of one species": second_cow,
		"animals as an object": FarmSave.with_changes(_raw(Fixtures.fresh_farm()), {"animals": {}}),
		"an animal that is not a record": FarmSave.with_changes(_raw(Fixtures.fresh_farm()), {"animals": ["cow"]}),
		"two animals with one id": twin,
		"an empty id": _with_animal(0, {"id": ""}),
		"a numeric id": _with_animal(0, {"id": 7}),
		"an unknown species": _with_animal(0, {"species": "dragon"}),
		"health below the glum floor": _with_animal(0, {"health": AnimalHealth.FLOOR - 1}),
		"health of zero": _with_animal(0, {"health": 0}),
		"health above max": _with_animal(0, {"health": AnimalHealth.MAX + 1}),
		"fractional health": _with_animal(0, {"health": 50.5}),
		"string health": _with_animal(0, {"health": "50"}),
		"done that is not a record": _with_animal(0, {"done": []}),
		"done missing a task": _with_animal(0, {"done": no_play}),
		"done with an extra task": _with_animal(0, {"done": extra_task}),
		"a negative day": _with_animal(0, {"done": {"feed": -1, "water": null, "clean": null, "play": null}}),
		"a fractional day": _with_animal(0, {"done": {"feed": 1.5, "water": null, "clean": null, "play": null}}),
		"a string day": _with_animal(0, {"done": {"feed": "today", "water": null, "clean": null, "play": null}}),
		"a day past any real one": _with_animal(0, {"done": {"feed": AnimalsCodec.MAX_DAY + 1, "water": null, "clean": null, "play": null}}),
	}
	for label: String in cases:
		assert_null(FarmSaveCodec.parse_farm_save(cases[label]), label)
