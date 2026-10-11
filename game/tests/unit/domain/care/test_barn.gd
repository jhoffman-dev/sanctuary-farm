## Barn (domain/care/barn.gd): the starting animals, what is due, and what a
## care task needs and does to the farm. Days are fixed numbers, no clock.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const TODAY := 20_000


func _farm(changes: Dictionary = {}) -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(), changes)


func _cow_with(changes: Dictionary) -> Dictionary:
	var cow := Barn.new_animal("cow", Species.COW)
	cow.merge(changes, true)
	return cow


func _done(feed_day: Variant = null, water_day: Variant = null) -> Dictionary:
	return {CareTask.FEED: feed_day, CareTask.WATER: water_day, CareTask.CLEAN: null, CareTask.PLAY: null}


# ─── the starting barn ───

func test_a_new_farm_starts_with_a_cow_a_pig_and_a_chick_at_start_health() -> void:
	var animals: Array = _farm().animals
	assert_eq(animals.map(func(a: Dictionary) -> String: return a.id), ["cow", "pig", "chick"])
	assert_eq(animals.map(func(a: Dictionary) -> String: return a.species), Array(Species.ALL))
	assert_true(animals.all(func(a: Dictionary) -> bool: return a.health == AnimalHealth.START))
	assert_eq(Barn.starting_animals(), animals)


func test_a_new_animal_has_every_task_due_and_no_care_day() -> void:
	var cow := Barn.new_animal("cow", Species.COW)
	assert_eq(Barn.tasks_due(cow, TODAY), CareTask.ALL)
	assert_null(Barn.last_cared_day(cow))


func test_the_last_care_day_is_the_latest_task_day() -> void:
	assert_eq(Barn.last_cared_day(_cow_with({"done": _done(TODAY - 3, TODAY - 1)})), TODAY - 1)


func test_a_task_done_today_is_not_due_and_one_done_yesterday_is() -> void:
	var cow := _cow_with({"done": _done(TODAY, TODAY - 1)})
	assert_eq(Barn.tasks_due(cow, TODAY), [CareTask.WATER, CareTask.CLEAN, CareTask.PLAY] as Array[String])
	assert_eq(Barn.tasks_due(cow, TODAY + 1), CareTask.ALL)


func test_health_today_includes_decay_since_the_last_care() -> void:
	var cow := _cow_with({"health": 80, "done": _done(TODAY - 3)})
	assert_eq(Barn.health_on(cow, TODAY), 80 - 2 * AnimalHealth.DECAY_PER_DAY)


# ─── check_care ───

func test_refuses_an_unknown_animal_or_task() -> void:
	assert_eq(Barn.check_care(_farm(), CareOrder.new("unicorn", CareTask.FEED), TODAY).error, Barn.UNKNOWN_ANIMAL)
	assert_eq(Barn.check_care(_farm(), CareOrder.new("cow", "sleep"), TODAY).error, Barn.UNKNOWN_TASK)


func test_refuses_a_task_already_done_today() -> void:
	var farm := _farm({"animals": [_cow_with({"done": _done(null, TODAY)})]})
	assert_eq(Barn.check_care(farm, CareOrder.new("cow", CareTask.WATER), TODAY).error, Barn.ALREADY_DONE_TODAY)
	assert_true(Barn.check_care(farm, CareOrder.new("cow", CareTask.WATER), TODAY + 1).ok)


func test_with_too_little_feed_feeding_says_visit_the_feed_shed_and_other_tasks_still_go() -> void:
	var farm := _farm({"feed": Coins.FEED_PER_FEEDING - 1})
	var refused := Barn.check_care(farm, CareOrder.new("pig", CareTask.FEED), TODAY)
	assert_false(refused.ok)
	assert_eq(refused.error, Barn.NEED_FEED)
	assert_eq(Barn.NEED_FEED, "visit-the-feed-shed")
	for task in [CareTask.WATER, CareTask.CLEAN, CareTask.PLAY]:
		assert_true(Barn.check_care(farm, CareOrder.new("pig", task), TODAY).ok, task)


func test_exactly_enough_feed_is_enough() -> void:
	var allowed := Barn.check_care(_farm({"feed": Coins.FEED_PER_FEEDING}), CareOrder.new("pig", CareTask.FEED), TODAY)
	assert_true(allowed.ok)
	assert_eq(allowed.value.id, "pig")


# ─── apply_care ───

func test_feeding_restores_health_marks_it_done_and_uses_three_feed() -> void:
	var farm := _farm({"feed": 10})
	var fed: Dictionary = Barn.apply_care(farm, CareOrder.new("cow", CareTask.FEED), TODAY).value
	var cow: Dictionary = fed.animals[0]
	assert_eq(cow.health, AnimalHealth.START + 16)
	assert_eq(cow.done[CareTask.FEED], TODAY)
	assert_eq(fed.feed, 10 - Coins.FEED_PER_FEEDING)
	assert_eq(fed.animals.slice(1), farm.animals.slice(1), "the other animals are untouched")


func test_water_clean_and_play_restore_without_using_feed() -> void:
	for task in [CareTask.WATER, CareTask.CLEAN, CareTask.PLAY]:
		var cared: Dictionary = Barn.apply_care(_farm({"feed": 0}), CareOrder.new("chick", task), TODAY).value
		assert_eq(cared.animals[2].health, AnimalHealth.START + 12, task)
		assert_eq(cared.animals[2].done[task], TODAY, task)
		assert_eq(cared.feed, 0, task)


func test_care_lands_on_top_of_todays_decayed_health() -> void:
	var neglected := _cow_with({"health": 70, "done": _done(TODAY - 31)})
	var fed: Dictionary = Barn.apply_care(_farm({"animals": [neglected]}), CareOrder.new("cow", CareTask.FEED), TODAY).value
	assert_eq(fed.animals[0].health, AnimalHealth.FLOOR + 16)


func test_health_caps_at_max() -> void:
	var farm := _farm({"animals": [_cow_with({"health": 95})]})
	var played: Dictionary = Barn.apply_care(farm, CareOrder.new("cow", CareTask.PLAY), TODAY).value
	assert_eq(played.animals[0].health, AnimalHealth.MAX)


func test_a_refused_care_changes_nothing_and_the_farm_given_is_never_edited() -> void:
	var farm := _farm({"feed": 1})
	var before := farm.duplicate(true)
	assert_eq(Barn.apply_care(farm, CareOrder.new("cow", CareTask.FEED), TODAY).error, Barn.NEED_FEED)
	assert_true(Barn.apply_care(farm, CareOrder.new("cow", CareTask.PLAY), TODAY).ok)
	assert_eq(farm, before)


func test_care_never_mints_coins() -> void:
	var farm := _farm({"coins": 4, "feed": 9})
	for task in CareTask.ALL:
		farm = Barn.apply_care(farm, CareOrder.new("pig", task), TODAY).value
	assert_eq(farm.coins, 4)
	assert_eq(farm.feed, 9 - Coins.FEED_PER_FEEDING)
