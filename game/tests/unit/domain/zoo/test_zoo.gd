## Zoo (domain/zoo/zoo.gd): where each animal lives, how many may visit, the
## barn <-> zoo move and its gentle refusals, and care following the animal.
## Days are fixed numbers, no clock.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const NestFixtures := preload("res://tests/support/nest_fixtures.gd")
const TODAY := 20_000


func _ids(animals: Array) -> Array:
	return animals.map(func(animal: Dictionary) -> String: return animal.id)


func _moved(farm: Dictionary, animal_id: String, home: String) -> Dictionary:
	var moved := Zoo.move(farm, animal_id, home)
	assert_true(moved.ok, moved.error)
	return moved.value


## A farm with `count` cows (ids "cow-0".."cow-<count-1>") all visiting the zoo
## and one pig in the barn — more animals than one-per-species allows, which
## only a capacity test needs.
func _crowded_farm(count: int) -> Dictionary:
	var animals := []
	for i in count:
		var cow := Barn.new_animal("cow-%d" % i, Species.COW)
		cow.home = Zoo.ZOO
		animals.append(cow)
	animals.append(Barn.new_animal("pig", Species.PIG))
	return FarmSave.with_changes(Fixtures.fresh_farm(), {"animals": animals})


# ─── where animals live ───

func test_every_animal_starts_in_the_barn() -> void:
	var farm := Fixtures.fresh_farm()
	assert_true(farm.animals.all(func(animal: Dictionary) -> bool: return animal.home == Zoo.BARN))
	assert_eq(_ids(Zoo.in_barn(farm)), ["cow", "pig", "chick"])
	assert_eq(Zoo.visitors(farm), [])
	assert_eq(Barn.new_animal("duck", Species.DUCK).home, Zoo.BARN, "a hatchling arrives in the barn")


func test_the_zoo_holds_every_animal_a_farm_can_own() -> void:
	# The prototype set no limit; one animal per species is the most a farm has.
	assert_eq(Zoo.CAPACITY, Species.ALL.size())
	var everyone := NestFixtures.with_animals(Fixtures.fresh_farm(), Species.ALL)
	for kind: String in Species.ALL:
		everyone = _moved(everyone, kind, Zoo.ZOO)
	assert_eq(Zoo.visitors(everyone).size(), Species.ALL.size())
	assert_eq(Zoo.in_barn(everyone), [], "the barn may stand empty while everyone visits")
	assert_true(Zoo.is_full(everyone))


func test_other_home_is_the_place_an_animal_would_move_to() -> void:
	assert_eq([Zoo.other_home(Zoo.BARN), Zoo.other_home(Zoo.ZOO)], [Zoo.ZOO, Zoo.BARN])


# ─── moving ───

func test_an_animal_moves_to_the_zoo_and_back() -> void:
	var farm := Fixtures.fresh_farm()
	var visiting := _moved(farm, "pig", Zoo.ZOO)
	assert_eq(_ids(Zoo.visitors(visiting)), ["pig"])
	assert_eq(_ids(Zoo.in_barn(visiting)), ["cow", "chick"])
	var home := _moved(visiting, "pig", Zoo.BARN)
	assert_eq(home, farm, "back where it started, nothing else changed")


func test_moving_changes_only_where_the_animal_lives() -> void:
	var farm: Dictionary = Barn.apply_care(Fixtures.fresh_farm(), CareOrder.new("pig", CareTask.FEED), TODAY).value
	farm = FarmSave.with_changes(farm, {"coins": 7})
	var before: Dictionary = farm.duplicate(true)
	var visiting := _moved(farm, "pig", Zoo.ZOO)
	assert_eq(farm, before, "the farm it was given is untouched")
	var pig: Dictionary = visiting.animals[1].duplicate(true)
	pig.home = Zoo.BARN
	assert_eq(pig, farm.animals[1], "health and care days unchanged")
	assert_eq([visiting.coins, visiting.feed, visiting.scheduler], [farm.coins, farm.feed, farm.scheduler], "free: no coins, feed or question")


func test_moves_keep_the_farm_order() -> void:
	var farm := _moved(_moved(Fixtures.fresh_farm(), "chick", Zoo.ZOO), "cow", Zoo.ZOO)
	assert_eq(_ids(Zoo.visitors(farm)), ["cow", "chick"], "farm order, not arrival order")
	assert_eq(_ids(farm.animals), ["cow", "pig", "chick"])


# ─── refusals ───

func test_an_unknown_animal_is_refused() -> void:
	var farm := Fixtures.fresh_farm()
	for animal_id: Variant in ["duck", "", 3, null]:
		var refused := Zoo.move(farm, animal_id, Zoo.ZOO)
		assert_eq([refused.ok, refused.error], [false, Barn.UNKNOWN_ANIMAL], str(animal_id))


func test_an_unknown_home_is_refused() -> void:
	var farm := Fixtures.fresh_farm()
	for home: Variant in ["pond", "", null, 1]:
		var refused := Zoo.move(farm, "pig", home)
		assert_eq([refused.ok, refused.error], [false, Zoo.UNKNOWN_HOME], str(home))


func test_moving_an_animal_where_it_already_is_is_refused() -> void:
	var farm := Fixtures.fresh_farm()
	assert_eq(Zoo.move(farm, "pig", Zoo.BARN).error, Zoo.ALREADY_THERE)
	var visiting := _moved(farm, "pig", Zoo.ZOO)
	assert_eq(Zoo.move(visiting, "pig", Zoo.ZOO).error, Zoo.ALREADY_THERE)


func test_a_full_zoo_turns_a_newcomer_away_but_lets_a_visitor_go_home() -> void:
	var full := _crowded_farm(Zoo.CAPACITY)
	assert_true(Zoo.is_full(full))
	var refused := Zoo.check_move(full, "pig", Zoo.ZOO)
	assert_eq([refused.ok, refused.error], [false, Zoo.ZOO_FULL])
	assert_eq(Zoo.move(full, "pig", Zoo.ZOO).error, Zoo.ZOO_FULL)
	var room := _moved(full, "cow-0", Zoo.BARN)
	assert_false(Zoo.is_full(room))
	assert_true(Zoo.move(room, "pig", Zoo.ZOO).ok, "one place freed is one place filled")


func test_check_move_returns_the_animal_that_may_move() -> void:
	var allowed := Zoo.check_move(Fixtures.fresh_farm(), "cow", Zoo.ZOO)
	assert_true(allowed.ok)
	assert_eq(allowed.value.id, "cow")


func test_within_capacity_counts_only_visitors() -> void:
	assert_true(Zoo.within_capacity(_crowded_farm(Zoo.CAPACITY).animals), "the barn pig does not count")
	assert_false(Zoo.within_capacity(_crowded_farm(Zoo.CAPACITY + 1).animals))
	assert_true(Zoo.within_capacity([]))


# ─── care follows the animal ───

func test_a_visitor_is_cared_for_exactly_as_in_the_barn() -> void:
	var farm := Fixtures.fresh_farm()
	var visiting := _moved(farm, "pig", Zoo.ZOO)
	var order := CareOrder.new("pig", CareTask.FEED)
	var in_barn: Dictionary = Barn.apply_care(farm, order, TODAY).value
	var in_zoo: Dictionary = Barn.apply_care(visiting, order, TODAY).value
	assert_eq([in_zoo.animals[1].health, in_zoo.feed], [in_barn.animals[1].health, in_barn.feed])
	assert_eq(in_zoo.animals[1].home, Zoo.ZOO, "care does not send it home")
	assert_eq(Barn.tasks_due(in_zoo.animals[1], TODAY), Barn.tasks_due(in_barn.animals[1], TODAY))


func test_a_visitor_decays_exactly_as_in_the_barn_capped_and_never_below_the_floor() -> void:
	var cared: Dictionary = Barn.apply_care(Fixtures.fresh_farm(), CareOrder.new("pig", CareTask.FEED), TODAY).value
	var visiting := _moved(cared, "pig", Zoo.ZOO)
	for days_later in [1, 3, 30]:
		var today: int = TODAY + days_later
		assert_eq(Barn.health_on(visiting.animals[1], today), Barn.health_on(cared.animals[1], today), str(days_later))
	var month_away := Barn.health_on(visiting.animals[1], TODAY + 30)
	assert_eq(month_away, Barn.health_on(visiting.animals[1], TODAY + 1 + AnimalHealth.MAX_DECAY_DAYS), "decay is capped")
	assert_gte(month_away, AnimalHealth.FLOOR)


func test_a_hatched_animal_visiting_the_zoo_stays_hatched() -> void:
	var farm := NestFixtures.mastered(Fixtures.fresh_farm(), 2)
	farm = Nest.hatch(farm, "egg-2").value
	var visiting := _moved(farm, "duck", Zoo.ZOO)
	assert_eq(Nest.hatched_animal_ids(visiting), ["duck"] as Array[String])
	assert_eq(Nest.eggs(visiting), [] as Array[Egg], "no second duck egg while the duck is out")
