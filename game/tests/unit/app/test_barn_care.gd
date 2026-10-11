## FarmGame's barn use-cases with fake adapters: start_care plays a short
## graded round, end_round applies the care only once every question is
## graded, and barn() is the read-model the barn scene binds to.
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const DAY := 20_000
## 10:00 UTC on DAY: the fake clock starts mid-morning.
const MORNING := DAY * CareDay.MSEC_PER_DAY + 10 * 3_600_000
const FLUENT_MS := 1500


func _loaded(farm: Variant = null) -> Harness:
	var built := Harness.new(farm, 1, MORNING)
	await built.game.load_farm()
	return built


func _farm_with(changes: Dictionary) -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(), changes)


## Answers every question in flight, correctly and fluently unless told otherwise.
func _play_out(built: Harness, correctly: bool = true) -> void:
	while built.game.current_question() != null:
		built.clock.advance(FLUENT_MS)
		var given := Harness.correct_answer_to(built.game.current_question())
		var answered: Result = await built.game.answer(given if correctly else given + 1)
		assert_true(answered.ok, answered.error)


func _animal(built: Harness, id: String) -> AnimalSummary:
	for animal: AnimalSummary in built.game.barn().value.animals:
		if animal.id == id:
			return animal
	return null


# ─── the read-model ───

func test_the_barn_is_refused_before_load() -> void:
	assert_string_contains(Harness.new().game.barn().error, "load_farm()")


func test_a_fresh_barn_has_three_happy_animals_with_every_task_due() -> void:
	var built := await _loaded()
	var barn: BarnSummary = built.game.barn().value
	assert_eq(barn.animals.map(func(a: AnimalSummary) -> String: return a.species), Array(Species.ALL))
	for animal: AnimalSummary in barn.animals:
		assert_eq([animal.health, animal.band, animal.tasks_due], [AnimalHealth.START, AnimalHealth.HAPPY, CareTask.ALL])
	assert_eq([barn.feed, barn.feed_per_feeding, barn.needs_feed_shed, barn.all_done_today], [Coins.STARTING_FEED, 3, false, false])


func test_a_month_away_finds_glum_animals_not_gone_ones() -> void:
	var cared: Dictionary = Barn.apply_care(Fixtures.fresh_farm(), CareOrder.new("cow", CareTask.PLAY), DAY - 30).value
	var built := await _loaded(cared)
	var cow := _animal(built, "cow")
	assert_eq([cow.health, cow.band], [AnimalHealth.FLOOR, AnimalHealth.GLUM])
	assert_eq(built.game.barn().value.animals.size(), 3, "nobody leaves")


func test_low_feed_shows_the_feed_shed_hint() -> void:
	var built := await _loaded(_farm_with({"feed": 2}))
	assert_true(built.game.barn().value.needs_feed_shed)


func test_an_animal_summary_reads_todays_health_band_and_due_tasks() -> void:
	var farm: Dictionary = Barn.apply_care(Fixtures.fresh_farm(), CareOrder.new("pig", CareTask.WATER), DAY).value
	var pig := AnimalSummary.of(farm.animals[1], DAY + 5)
	assert_eq([pig.id, pig.species], ["pig", Species.PIG])
	assert_eq(pig.health, AnimalHealth.START + 12 - 4 * AnimalHealth.DECAY_PER_DAY)
	assert_eq(pig.band, AnimalHealth.GLUM)
	assert_eq(AnimalSummary.of(farm.animals[1], DAY).tasks_due, [CareTask.FEED, CareTask.CLEAN, CareTask.PLAY] as Array[String])


func test_a_barn_summary_is_done_for_the_day_only_when_every_task_is() -> void:
	var farm := _farm_with({"animals": [Barn.new_animal("cow", Species.COW)], "feed": 3})
	for task in CareTask.ALL:
		assert_false(BarnSummary.of(farm, DAY).all_done_today, task)
		farm = Barn.apply_care(farm, CareOrder.new("cow", task), DAY).value
	var barn := BarnSummary.of(farm, DAY)
	assert_eq([barn.all_done_today, barn.feed, barn.needs_feed_shed], [true, 0, true])
	assert_false(BarnSummary.of(farm, DAY + 1).all_done_today)


# ─── start_care ───

func test_a_care_round_is_a_stall_round_as_long_as_its_task() -> void:
	var built := await _loaded()
	var first: Result = built.game.start_care("cow", CareTask.FEED)
	assert_true(first.ok, first.error)
	assert_true(is_same(built.game.current_question(), first.value))
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, CareTask.questions_for(CareTask.FEED), false])
	var order := built.game.care_in_progress()
	assert_eq([order.animal_id, order.task], ["cow", CareTask.FEED])
	assert_eq(RoundPresets.care(CareTask.PLAY).questions, 3)
	assert_eq(RoundPresets.care(CareTask.PLAY).context, SessionContext.STALL)


func test_with_too_little_feed_feeding_is_a_gentle_refusal_and_water_still_starts() -> void:
	var built := await _loaded(_farm_with({"feed": 2}))
	assert_eq(built.game.start_care("pig", CareTask.FEED).error, Barn.NEED_FEED)
	assert_null(built.game.current_question())
	assert_true(built.game.start_care("pig", CareTask.WATER).ok)


func test_refuses_before_load_an_unknown_animal_or_task_and_a_second_round() -> void:
	assert_string_contains(Harness.new().game.start_care("cow", CareTask.FEED).error, "load_farm()")
	var built := await _loaded()
	assert_eq(built.game.start_care("unicorn", CareTask.FEED).error, Barn.UNKNOWN_ANIMAL)
	assert_eq(built.game.start_care("cow", "nap").error, Barn.UNKNOWN_TASK)
	assert_true(built.game.start_care("cow", CareTask.PLAY).ok)
	assert_string_contains(built.game.start_care("pig", CareTask.PLAY).error, "already active")
	assert_string_contains(built.game.start_round(RoundPresets.paddock()).error, "already active")


func test_a_paddock_round_cares_for_nobody() -> void:
	var built := await _loaded()
	assert_null(built.game.care_in_progress())
	built.game.start_round(RoundPresets.paddock())
	assert_null(built.game.care_in_progress())


# ─── end_round applies the care ───

func test_a_completed_feeding_restores_health_uses_feed_and_is_saved() -> void:
	var built := await _loaded()
	built.game.start_care("cow", CareTask.FEED)
	await _play_out(built)
	var ended: Result = await built.game.end_round()
	assert_true(ended.ok, ended.error)
	assert_eq(ended.value.context, SessionContext.STALL)
	var cow := _animal(built, "cow")
	assert_eq(cow.health, AnimalHealth.START + 16)
	assert_false(cow.tasks_due.has(CareTask.FEED))
	assert_eq(built.game.barn().value.feed, Coins.STARTING_FEED - Coins.FEED_PER_FEEDING)
	assert_eq(built.store.stored.animals[0].done[CareTask.FEED], DAY)
	assert_null(built.game.care_in_progress())


func test_care_rounds_never_mint_coins_even_when_every_answer_is_fluent() -> void:
	var built := await _loaded()
	for task in CareTask.ALL:
		built.game.start_care("chick", task)
		await _play_out(built)
		await built.game.end_round()
	assert_eq(built.game.summary().value.coins, 0)
	assert_true(_animal(built, "chick").tasks_due.is_empty())


func test_a_round_ended_early_applies_no_care_and_uses_no_feed() -> void:
	var built := await _loaded()
	built.game.start_care("pig", CareTask.FEED)
	await built.game.answer(Harness.correct_answer_to(built.game.current_question()))
	var ended: Result = await built.game.end_round()
	assert_true(ended.ok)
	assert_eq(ended.value.entries.size(), 1, "the answers still count as practice")
	var pig := _animal(built, "pig")
	assert_eq([pig.health, pig.tasks_due], [AnimalHealth.START, CareTask.ALL])
	assert_eq(built.game.barn().value.feed, Coins.STARTING_FEED)


func test_a_completed_round_counts_even_with_wrong_answers() -> void:
	var built := await _loaded()
	built.game.start_care("cow", CareTask.CLEAN)
	await _play_out(built, false)
	await built.game.end_round()
	assert_eq(_animal(built, "cow").health, AnimalHealth.START + 12)


func test_a_task_is_once_a_day_until_local_midnight() -> void:
	var built := await _loaded()
	built.game.start_care("cow", CareTask.PLAY)
	await _play_out(built)
	await built.game.end_round()
	assert_eq(built.game.start_care("cow", CareTask.PLAY).error, Barn.ALREADY_DONE_TODAY)
	built.clock.offset_minutes = 14 * 60
	assert_true(built.game.start_care("cow", CareTask.PLAY).ok, "past midnight fourteen hours east")


func test_the_next_day_the_tasks_are_due_again() -> void:
	var built := await _loaded()
	built.game.start_care("cow", CareTask.WATER)
	await _play_out(built)
	await built.game.end_round()
	built.clock.advance(CareDay.MSEC_PER_DAY)
	assert_eq(_animal(built, "cow").tasks_due, CareTask.ALL)


func test_a_refused_save_applies_no_care_and_keeps_the_round_open() -> void:
	var built := await _loaded()
	built.game.start_care("cow", CareTask.FEED)
	await _play_out(built)
	built.store.refuse_writes = true
	assert_false((await built.game.end_round()).ok)
	assert_eq(_animal(built, "cow").health, AnimalHealth.START)
	assert_eq(built.game.barn().value.feed, Coins.STARTING_FEED)
	assert_not_null(built.game.care_in_progress())
	built.store.refuse_writes = false
	assert_true((await built.game.end_round()).ok)
	assert_eq(_animal(built, "cow").health, AnimalHealth.START + 16)


func test_every_animal_every_task_is_a_full_day() -> void:
	var built := await _loaded(_farm_with({"feed": 9}))
	for id in ["cow", "pig", "chick"]:
		for task in CareTask.ALL:
			assert_true(built.game.start_care(id, task).ok, "%s %s" % [id, task])
			await _play_out(built)
			await built.game.end_round()
	var barn: BarnSummary = built.game.barn().value
	assert_true(barn.all_done_today)
	assert_eq(barn.feed, 0)
	assert_true(barn.needs_feed_shed)
