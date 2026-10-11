## The v4 barn field through FarmSaveCodec (AnimalsCodec): round-trip through
## real JSON text, the v3 -> v4 migration, saves from before the petting zoo,
## and every impossible animal refused.
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


func test_round_trips_animals_visiting_the_petting_zoo() -> void:
	var farm: Dictionary = Zoo.move(_cared_farm(), "pig", Zoo.ZOO).value
	var loaded: Dictionary = FarmSaveCodec.decode(FarmSaveCodec.encode(farm))
	assert_eq(loaded, farm)
	assert_eq(loaded.animals.map(func(a: Dictionary) -> String: return a.home), [Zoo.BARN, Zoo.ZOO, Zoo.BARN])


func test_a_full_zoo_loads() -> void:
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(), {
		"animals": Species.ALL.map(func(kind: String) -> Dictionary: return Barn.new_animal(kind, kind)),
	})
	for kind: String in Species.ALL:
		farm = Zoo.move(farm, kind, Zoo.ZOO).value
	assert_true(Zoo.is_full(farm))
	assert_eq(FarmSaveCodec.decode(FarmSaveCodec.encode(farm)), farm)


func test_a_v4_save_from_before_the_zoo_loads_with_every_animal_in_the_barn() -> void:
	var raw := _raw(_cared_farm())
	for animal: Dictionary in raw.animals:
		animal.erase("home")
	var loaded: Dictionary = FarmSaveCodec.parse_farm_save(raw)
	assert_eq(loaded, _cared_farm(), "care kept, everyone at home")
	assert_eq(loaded.schema_version, 4, "no version bump: a missing home is the barn")
	assert_eq(FarmSaveCodec.encode(loaded), FarmSaveCodec.encode(_cared_farm()), "written back with homes")


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
		"a home that is neither barn nor zoo": _with_animal(0, {"home": "pond"}),
		"a numeric home": _with_animal(0, {"home": 1}),
		"a null home": _with_animal(0, {"home": null}),
		"a capitalised home": _with_animal(0, {"home": "Zoo"}),
		"a day past any real one": _with_animal(0, {"done": {"feed": AnimalsCodec.MAX_DAY + 1, "water": null, "clean": null, "play": null}}),
	}
	for label: String in cases:
		assert_null(FarmSaveCodec.parse_farm_save(cases[label]), label)
