## FarmGame's petting zoo use-cases with fake adapters: zoo() is the
## read-model the zoo scene binds to, move_to_zoo / move_to_barn move an
## animal through the serialised save, the barn read-model shows only the
## animals at home, care carries on in the zoo, and the zoo settles down at
## goodnight and while a round runs.
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const NestFixtures := preload("res://tests/support/nest_fixtures.gd")
const DAY := 20_000
## 10:00 UTC on DAY.
const MORNING := DAY * CareDay.MSEC_PER_DAY + 10 * 3_600_000
const FLUENT_MS := 1500


func _loaded(farm: Variant = null) -> Harness:
	var built := Harness.new(farm, 1, MORNING)
	await built.game.load_farm()
	return built


func _zoo(built: Harness) -> ZooSummary:
	return built.game.zoo().value


func _ids(entries: Array[ZooAnimal]) -> Array:
	return entries.map(func(entry: ZooAnimal) -> String: return entry.animal.id)


## [can_move, why_not] for every entry, in order.
func _moves(entries: Array[ZooAnimal]) -> Array:
	return entries.map(func(entry: ZooAnimal) -> Array: return [entry.can_move, entry.why_not])


func _answer_all(built: Harness) -> void:
	while built.game.current_question() != null:
		built.clock.advance(FLUENT_MS)
		var answered: Result = await built.game.answer(Harness.correct_answer_to(built.game.current_question()))
		assert_true(answered.ok, answered.error)


func _to_zoo(built: Harness, animal_id: String) -> ZooSummary:
	var moved: Result = await built.game.move_to_zoo(animal_id)
	assert_true(moved.ok, moved.error)
	return moved.value


# ─── the read-model ───

func test_the_zoo_is_refused_before_load() -> void:
	assert_string_contains(Harness.new().game.zoo().error, "load_farm()")


func test_a_fresh_zoo_is_empty_and_every_barn_animal_may_visit() -> void:
	var zoo := _zoo(await _loaded())
	assert_eq(zoo.visitors, [] as Array[ZooAnimal])
	assert_eq(_ids(zoo.in_barn), ["cow", "pig", "chick"])
	assert_eq(_moves(zoo.in_barn), [[true, ""], [true, ""], [true, ""]])
	assert_eq([zoo.capacity, zoo.places_left, zoo.is_full, zoo.closed_because], [Zoo.CAPACITY, Zoo.CAPACITY, false, ""])


func test_a_visitors_entry_carries_its_health_mood_and_chores() -> void:
	var built := await _loaded()
	var zoo := await _to_zoo(built, "pig")
	var pig := zoo.visitors[0].animal
	assert_eq([pig.id, pig.species, pig.home, pig.health, pig.band], ["pig", Species.PIG, Zoo.ZOO, AnimalHealth.START, AnimalHealth.HAPPY])
	assert_eq(pig.tasks_due, CareTask.ALL, "a visitor still has its chores")
	assert_eq([zoo.places_left, zoo.visitors[0].can_move], [Zoo.CAPACITY - 1, true])


func test_a_full_zoo_says_so_on_each_barn_animal() -> void:
	var farm := NestFixtures.with_animals(Fixtures.fresh_farm(), Species.ALL)
	for kind in Species.ALL.slice(0, Zoo.CAPACITY - 1):
		farm = Zoo.move(farm, kind, Zoo.ZOO).value
	var built := await _loaded(farm)
	var zoo := await _to_zoo(built, Species.ALL[Zoo.CAPACITY - 1])
	assert_eq([zoo.is_full, zoo.places_left], [true, 0])
	assert_true(zoo.visitors.all(func(entry: ZooAnimal) -> bool: return entry.can_move), "visitors can always go home")


func test_a_closed_zoo_gives_its_reason_on_every_entry() -> void:
	var farm: Dictionary = Zoo.move(Fixtures.fresh_farm(), "cow", Zoo.ZOO).value
	var zoo := ZooSummary.of(farm, DAY, PlaySession.GOODNIGHT)
	assert_eq(_moves(zoo.visitors) + _moves(zoo.in_barn), [
		[false, PlaySession.GOODNIGHT], [false, PlaySession.GOODNIGHT], [false, PlaySession.GOODNIGHT],
	])
	assert_eq([zoo.places_left, zoo.is_full], [Zoo.CAPACITY - 1, false], "room is still reported")


func test_an_entry_can_move_only_without_a_refusal() -> void:
	var pig := AnimalSummary.of(Barn.new_animal("pig", Species.PIG), DAY)
	var open := ZooAnimal.of(pig, "")
	var full := ZooAnimal.of(pig, Zoo.ZOO_FULL)
	assert_eq([open.animal, open.can_move, open.why_not], [pig, true, ""])
	assert_eq([full.can_move, full.why_not], [false, Zoo.ZOO_FULL])


# ─── moving ───

func test_an_animal_visits_the_zoo_and_comes_home() -> void:
	var built := await _loaded()
	var zoo := await _to_zoo(built, "pig")
	assert_eq([_ids(zoo.visitors), _ids(zoo.in_barn)], [["pig"], ["cow", "chick"]])
	assert_eq(built.store.stored.animals[1].home, Zoo.ZOO, "saved")
	var home: Result = await built.game.move_to_barn("pig")
	assert_true(home.ok, home.error)
	assert_eq(_ids(home.value.in_barn), ["cow", "pig", "chick"])
	assert_eq(built.store.stored.animals[1].home, Zoo.BARN)


func test_the_barn_shows_only_the_animals_at_home() -> void:
	var built := await _loaded()
	await _to_zoo(built, "cow")
	var barn: BarnSummary = built.game.barn().value
	assert_eq(barn.animals.map(func(a: AnimalSummary) -> String: return a.id), ["pig", "chick"])
	assert_true(barn.animals.all(func(a: AnimalSummary) -> bool: return a.home == Zoo.BARN))


func test_moving_is_free_and_does_not_count_as_play() -> void:
	var built := await _loaded(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 5}))
	await _to_zoo(built, "pig")
	var farm: Dictionary = built.store.stored
	assert_eq([farm.coins, farm.feed, farm.sessions, farm.play_session], [5, Coins.STARTING_FEED, [], null])
	assert_null(built.game.current_question(), "no question asked")


func test_refusals_write_nothing() -> void:
	var built := await _loaded()
	var unknown: Result = await built.game.move_to_zoo("duck")
	assert_eq([unknown.ok, unknown.error], [false, Barn.UNKNOWN_ANIMAL])
	var at_home: Result = await built.game.move_to_barn("pig")
	assert_eq([at_home.ok, at_home.error], [false, Zoo.ALREADY_THERE])
	assert_eq(built.store.saved.size(), 0)


func test_a_full_zoo_refuses_a_newcomer_and_writes_nothing() -> void:
	var farm := NestFixtures.with_animals(Fixtures.fresh_farm(), Species.ALL)
	for kind in Species.ALL:
		farm = Zoo.move(farm, kind, Zoo.ZOO).value
	farm = Zoo.move(farm, Species.COW, Zoo.BARN).value
	farm = FarmSave.with_changes(farm, {"animals": farm.animals + [_extra_goat_in_the_zoo()]})
	var built := await _loaded(farm)
	var refused: Result = await built.game.move_to_zoo(Species.COW)
	assert_eq([refused.ok, refused.error], [false, Zoo.ZOO_FULL])
	assert_eq(_moves(_zoo(built).in_barn), [[false, Zoo.ZOO_FULL]])
	assert_eq(built.store.saved.size(), 0)


func _extra_goat_in_the_zoo() -> Dictionary:
	var goat := Barn.new_animal("goat-2", Species.GOAT)
	goat.home = Zoo.ZOO
	return goat


func test_moves_are_refused_before_load() -> void:
	var game := Harness.new().game
	assert_string_contains((await game.move_to_zoo("pig")).error, "load_farm()")
	assert_string_contains((await game.move_to_barn("pig")).error, "load_farm()")


func test_a_refused_save_leaves_the_animal_where_it_was() -> void:
	var built := await _loaded()
	built.store.refuse_next = true
	var refused: Result = await built.game.move_to_zoo("pig")
	assert_false(refused.ok)
	assert_string_contains(refused.error, "could not be saved")
	assert_eq(_zoo(built).visitors, [] as Array[ZooAnimal])
	assert_eq(_ids(_zoo(built).in_barn), ["cow", "pig", "chick"])


# ─── care in the zoo ───

func test_a_visitor_is_cared_for_from_the_zoo() -> void:
	var built := await _loaded()
	await _to_zoo(built, "pig")
	var started := built.game.start_care("pig", CareTask.WATER)
	assert_true(started.ok, started.error)
	await _answer_all(built)
	var ended: Result = await built.game.end_round()
	assert_true(ended.ok, ended.error)
	var pig := _zoo(built).visitors[0].animal
	assert_eq(pig.tasks_due, [CareTask.FEED, CareTask.CLEAN, CareTask.PLAY] as Array[String])
	assert_eq(pig.home, Zoo.ZOO, "care does not send it home")


func test_all_done_today_counts_the_visitors_chores() -> void:
	var farm := NestFixtures.with_animals(Fixtures.fresh_farm(), [Species.COW, Species.PIG])
	for task in CareTask.ALL:
		farm = Barn.apply_care(farm, CareOrder.new("cow", task), DAY).value
	farm = Zoo.move(farm, "pig", Zoo.ZOO).value
	var built := await _loaded(FarmSave.with_changes(farm, {"feed": 99}))
	assert_false(built.game.barn().value.all_done_today, "the pig in the zoo still has chores")
	for task in CareTask.ALL:
		assert_true(built.game.start_care("pig", task).ok, task)
		await _answer_all(built)
		await built.game.end_round()
	assert_true(built.game.barn().value.all_done_today)


# ─── when the zoo is closed ───

func test_no_animal_moves_while_a_round_runs() -> void:
	var built := await _loaded()
	assert_true(built.game.start_care("pig", CareTask.FEED).ok)
	var zoo := _zoo(built)
	assert_eq(zoo.closed_because, FarmGame.ROUND_IS_ACTIVE)
	assert_true(zoo.in_barn.all(func(entry: ZooAnimal) -> bool: return entry.why_not == FarmGame.ROUND_IS_ACTIVE))
	var refused: Result = await built.game.move_to_zoo("pig")
	assert_eq([refused.ok, refused.error], [false, FarmGame.ROUND_IS_ACTIVE])
	await _answer_all(built)
	await built.game.end_round()
	assert_eq(_zoo(built).closed_because, "", "open again once the round closes")
	assert_true((await built.game.move_to_zoo("pig")).ok)


func test_the_zoo_settles_down_at_goodnight_and_writes_nothing() -> void:
	var built := await _loaded()
	await _to_zoo(built, "pig")
	assert_true(built.game.start_round(RoundPlan.new(SessionContext.PADDOCK, 3)).ok)
	await _answer_all(built)
	await built.game.end_round()
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC
	var writes := built.store.saved.size()
	var zoo := _zoo(built)
	assert_eq(zoo.closed_because, PlaySession.GOODNIGHT)
	assert_eq(_moves(zoo.visitors), [[false, PlaySession.GOODNIGHT]])
	for refused: Result in [await built.game.move_to_barn("pig"), await built.game.move_to_zoo("cow")]:
		assert_eq([refused.ok, refused.error], [false, PlaySession.GOODNIGHT])
	assert_eq(built.store.saved.size(), writes)
	assert_eq(_ids(_zoo(built).visitors), ["pig"], "the visitor stays the night")


func test_where_animals_live_survives_a_reload() -> void:
	var built := await _loaded()
	await _to_zoo(built, "chick")
	var reloaded := Harness.new(FarmSaveCodec.decode(FarmSaveCodec.encode(built.store.stored)), 1, MORNING)
	await reloaded.game.load_farm()
	assert_eq(_ids(_zoo(reloaded).visitors), ["chick"])
