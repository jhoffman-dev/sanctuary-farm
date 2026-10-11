## The nest's rules: which eggs are in the nest, how they grow (only from
## graded, latency-weighted answers), when they hatch, and what hatching does.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const NestFixtures := preload("res://tests/support/nest_fixtures.gd")
const DAY := 20_000


func _ids(eggs: Array[Egg]) -> Array:
	return eggs.map(func(egg: Egg) -> String: return egg.id)


func _egg(farm: Dictionary, egg_id: String) -> Egg:
	return Nest.find_egg(farm, egg_id).value


func _graded(farm: Dictionary, fact_id: String, latency_ms: float, correctly: bool = true) -> Dictionary:
	var answer := FactTable.get_fact(fact_id).answer + (0 if correctly else 1)
	var graded := Fixtures.grade(farm.scheduler, fact_id, answer, latency_ms)
	return FarmSave.with_changes(farm, {"scheduler": graded.state})


# ─── which eggs ───

func test_every_family_hatches_into_its_own_species() -> void:
	assert_eq(Nest.FAMILY_SPECIES.keys(), Array(FactTuning.ALL_FAMILIES))
	var kinds: Array = Nest.FAMILY_SPECIES.values()
	for kind: String in kinds:
		assert_true(Species.ALL.has(kind), kind)
		assert_eq(kinds.count(kind), 1, "%s hatches from one family only" % kind)
	assert_eq(kinds.size(), Species.ALL.size(), "every species has a family")


func test_a_fresh_nest_holds_only_the_2s_egg() -> void:
	# Families 1, 2, 10 start introduced; 1 (chick) and 10 (cow) already live in the barn.
	var eggs := Nest.eggs(Fixtures.fresh_farm())
	assert_eq(_ids(eggs), ["egg-2"])
	assert_eq([eggs[0].family, eggs[0].species], [2, Species.DUCK])
	assert_eq(eggs[0].id, Nest.egg_id_for(2))


func test_an_egg_is_laid_once_practice_introduces_a_fact_of_its_family() -> void:
	var farm := Fixtures.fresh_farm()
	var scheduler := Fixtures.with_fact(farm.scheduler, "7x3", {})
	farm = FarmSave.with_changes(farm, {"scheduler": scheduler})
	assert_eq(_ids(Nest.eggs(farm)), ["egg-2", "egg-7"], "in family order")
	assert_eq(_egg(farm, "egg-7").species, Species.DOG)


func test_a_family_whose_animal_is_in_the_barn_has_no_egg() -> void:
	var farm := NestFixtures.with_animals(Fixtures.fresh_farm(), [Species.DUCK])
	assert_eq(_ids(Nest.eggs(farm)), ["egg-1", "egg-10"], "the chick and cow are not in this barn; the duck is")


func test_only_families_in_play_have_eggs() -> void:
	var farm := NestFixtures.with_animals(Fixtures.fresh_farm(6), [])
	var scheduler := Fixtures.with_fact(farm.scheduler, "6x6", {})
	farm = FarmSave.with_changes(farm, {"scheduler": scheduler})
	assert_eq(_ids(Nest.eggs(farm)), ["egg-1", "egg-2", "egg-6"], "the 10s are out of a 6x6 table")


func test_find_egg_refuses_anything_that_is_not_in_the_nest() -> void:
	var farm := Fixtures.fresh_farm()
	for egg_id: Variant in ["egg-7", "egg-10", "egg-13", "duck", "", 2, null]:
		assert_eq(Nest.find_egg(farm, egg_id).error, Nest.UNKNOWN_EGG, str(egg_id))
	assert_eq(Nest.find_egg(farm, "egg-2").value.family, 2)


# ─── how an egg grows ───

func test_progress_is_the_familys_progress() -> void:
	var farm := NestFixtures.with_family(Fixtures.fresh_farm(), 2, {"box": 3})
	var egg := _egg(farm, "egg-2")
	assert_eq(Nest.progress(farm, egg), Mastery.family_progress(farm.scheduler, 2))
	assert_eq(Nest.progress(farm, egg), Mastery.UNMASTERED_PROGRESS_CAP, "all at box 3 looks almost full, never full")
	assert_eq(Nest.progress(Fixtures.fresh_farm(), egg), 0.0)


func test_a_fluent_answer_grows_the_egg_a_slow_one_does_not_and_a_wrong_one_cannot() -> void:
	var farm := NestFixtures.with_family(Fixtures.fresh_farm(), 2, {"box": 2})
	var egg := _egg(farm, "egg-2")
	var fact_id: String = NestFixtures.family_ids(2)[0]
	var before := Nest.progress(farm, egg)
	assert_gt(Nest.progress(_graded(farm, fact_id, 900), egg), before, "fluent promotes to box 3")
	assert_eq(Nest.progress(_graded(farm, fact_id, FactTuning.FLUENT_MAX_MS + 1000), egg), before, "slow holds the box")
	assert_eq(Nest.progress(_graded(farm, fact_id, 900, false), egg), before, "wrong never grows it")


func test_slow_correct_answers_never_hatch_an_egg() -> void:
	var farm := NestFixtures.one_answer_from_hatching(Fixtures.fresh_farm(), 2)
	var fact_id: String = NestFixtures.family_ids(2)[0]
	for i in 5:
		farm = _graded(farm, fact_id, FactTuning.FLUENT_MAX_MS + 1000)
	assert_false(Nest.is_ready_to_hatch(farm, _egg(farm, "egg-2")))


# ─── hatching ───

func test_an_egg_is_ready_to_hatch_exactly_when_its_family_is_mastered() -> void:
	var almost := NestFixtures.one_answer_from_hatching(Fixtures.fresh_farm(), 2)
	assert_false(Nest.is_ready_to_hatch(almost, _egg(almost, "egg-2")))
	assert_null(Nest.next_to_hatch(almost))
	var ready := _graded(almost, NestFixtures.family_ids(2)[0], 900)
	assert_true(Nest.is_ready_to_hatch(ready, _egg(ready, "egg-2")))
	assert_eq(Nest.progress(ready, _egg(ready, "egg-2")), 1.0)
	assert_eq(Nest.next_to_hatch(ready).id, "egg-2")


func test_the_next_to_hatch_is_the_lowest_ready_family() -> void:
	var farm := NestFixtures.mastered(NestFixtures.mastered(Fixtures.fresh_farm(), 7), 3)
	assert_eq(Nest.next_to_hatch(farm).id, "egg-3")


func test_practice_is_refused_for_an_unknown_or_a_ready_egg() -> void:
	var farm := Fixtures.fresh_farm()
	assert_eq(Nest.check_practice(farm, "egg-2").value.id, "egg-2")
	assert_eq(Nest.check_practice(farm, "egg-9").error, Nest.UNKNOWN_EGG)
	assert_eq(Nest.check_practice(NestFixtures.mastered(farm, 2), "egg-2").error, Nest.READY_TO_HATCH)


func test_hatching_adds_exactly_one_new_animal_and_the_egg_leaves_the_nest() -> void:
	var farm := NestFixtures.mastered(Fixtures.fresh_farm(), 2)
	var hatched: Dictionary = Nest.hatch(farm, "egg-2").value
	assert_eq(hatched.animals.size(), farm.animals.size() + 1)
	assert_eq(hatched.animals.slice(0, farm.animals.size()), farm.animals, "the others are untouched")
	assert_eq(hatched.animals.back(), Barn.new_animal(Species.DUCK, Species.DUCK))
	assert_eq(_ids(Nest.eggs(hatched)), [])
	assert_eq(Nest.hatch(hatched, "egg-2").error, Nest.UNKNOWN_EGG, "an egg hatches once")
	assert_eq(FarmSave.with_changes(hatched, {"animals": farm.animals}), farm, "nothing else changes")


func test_hatching_waits_for_mastery_and_changes_nothing_when_refused() -> void:
	var farm: Dictionary = Fixtures.deep_freeze(NestFixtures.one_answer_from_hatching(Fixtures.fresh_farm(), 2))
	assert_eq(Nest.hatch(farm, "egg-2").error, Nest.NOT_READY)
	assert_eq(Nest.hatch(farm, "egg-5").error, Nest.UNKNOWN_EGG)


func test_hatching_does_not_edit_the_farm_it_was_given() -> void:
	var farm: Dictionary = Fixtures.deep_freeze(NestFixtures.mastered(Fixtures.fresh_farm(), 2))
	assert_true(Nest.hatch(farm, "egg-2").ok)


func test_a_hatched_animal_is_cared_for_under_the_barn_rules() -> void:
	var farm: Dictionary = Nest.hatch(NestFixtures.mastered(Fixtures.fresh_farm(), 2), "egg-2").value
	var duck: Dictionary = farm.animals.back()
	assert_eq(Barn.tasks_due(duck, DAY), CareTask.ALL)
	var fed: Dictionary = Barn.apply_care(farm, CareOrder.new("duck", CareTask.FEED), DAY).value
	assert_eq(fed.animals.back().health, AnimalHealth.START + CareTask.health_bonus(CareTask.FEED))
	assert_eq(fed.feed, farm.feed - CareTask.feed_cost(CareTask.FEED))


func test_hatched_animal_ids_leave_out_the_day_one_animals() -> void:
	var farm := Fixtures.fresh_farm()
	assert_eq(Nest.hatched_animal_ids(farm), [] as Array[String])
	var hatched: Dictionary = Nest.hatch(NestFixtures.mastered(farm, 2), "egg-2").value
	assert_eq(Nest.hatched_animal_ids(hatched), ["duck"] as Array[String])


# ─── after the last egg ───

func test_the_nest_is_done_once_every_family_in_play_has_hatched() -> void:
	assert_false(Nest.all_hatched(Fixtures.fresh_farm()))
	var everyone := NestFixtures.with_animals(Fixtures.fresh_farm(), Species.ALL)
	assert_true(Nest.all_hatched(everyone))
	assert_eq(_ids(Nest.eggs(NestFixtures.mastered(everyone, 2))), [], "a mastered family lays no new egg")
	assert_null(Nest.next_to_hatch(NestFixtures.mastered(everyone, 2)))


func test_a_smaller_table_is_done_once_its_own_families_hatch() -> void:
	var kinds := [1, 2, 3, 4, 5, 6].map(func(family: int) -> String: return Nest.FAMILY_SPECIES[family])
	assert_true(Nest.all_hatched(NestFixtures.with_animals(Fixtures.fresh_farm(6), kinds)))
	assert_false(Nest.all_hatched(NestFixtures.with_animals(Fixtures.fresh_farm(12), kinds)))
