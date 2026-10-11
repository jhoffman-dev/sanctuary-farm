## FarmGame's nest use-cases with fake adapters: nest() is the read-model the
## nest scene binds to, start_egg plays one family's round through the usual
## round machinery (coins, goodnight), and a mastered egg waits for the round
## to close before the scene plays its ceremony and confirms with hatch().
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const NestFixtures := preload("res://tests/support/nest_fixtures.gd")
const DAY := 20_000
## 10:00 UTC on DAY.
const MORNING := DAY * CareDay.MSEC_PER_DAY + 10 * 3_600_000
const FLUENT_MS := 1500
const SLOW_MS := FactTuning.FLUENT_MAX_MS + 1000


func _loaded(farm: Variant = null) -> Harness:
	var built := Harness.new(farm, 1, MORNING)
	await built.game.load_farm()
	return built


func _nest(built: Harness) -> NestSummary:
	return built.game.nest().value


## Answers every question in flight, taking `latency_ms` over each.
func _answer_all(built: Harness, latency_ms: int = FLUENT_MS, correctly: bool = true) -> void:
	while built.game.current_question() != null:
		built.clock.advance(latency_ms)
		var given := Harness.correct_answer_to(built.game.current_question())
		var answered: Result = await built.game.answer(given if correctly else given + 1)
		assert_true(answered.ok, answered.error)


func _play_egg(built: Harness, egg_id: String, latency_ms: int = FLUENT_MS, correctly: bool = true) -> void:
	var started := built.game.start_egg(egg_id)
	assert_true(started.ok, started.error)
	await _answer_all(built, latency_ms, correctly)
	var ended: Result = await built.game.end_round()
	assert_true(ended.ok, ended.error)


func _egg_progress(built: Harness, egg_id: String) -> float:
	for egg: EggSummary in _nest(built).eggs:
		if egg.id == egg_id:
			return egg.progress
	return -1.0


# ─── the read-model ───

func test_the_nest_is_refused_before_load() -> void:
	assert_string_contains(Harness.new().game.nest().error, "load_farm()")


func test_a_fresh_nest_has_the_2s_egg_and_nothing_hatched() -> void:
	var nest := _nest(await _loaded())
	assert_eq(nest.eggs.size(), 1)
	var egg := nest.eggs[0]
	assert_eq([egg.id, egg.family, egg.species, egg.progress, egg.ready_to_hatch], ["egg-2", 2, Species.DUCK, 0.0, false])
	assert_null(nest.pending_hatch)
	assert_eq(nest.hatched, [] as Array[String])
	assert_false(nest.all_hatched)


func test_an_egg_summary_reads_progress_and_readiness() -> void:
	var farm := NestFixtures.with_family(Fixtures.fresh_farm(), 2, {"box": 3})
	var egg := EggSummary.of(farm, Nest.find_egg(farm, "egg-2").value)
	assert_eq([egg.progress, egg.ready_to_hatch], [Mastery.UNMASTERED_PROGRESS_CAP, false])
	var ready := NestFixtures.mastered(farm, 2)
	assert_eq(EggSummary.of(ready, Nest.find_egg(ready, "egg-2").value).ready_to_hatch, true)


func test_a_nest_summary_holds_the_pending_hatch_back_while_a_round_runs() -> void:
	var farm := NestFixtures.mastered(Fixtures.fresh_farm(), 2)
	assert_eq(NestSummary.of(farm, false).pending_hatch.id, "egg-2")
	assert_null(NestSummary.of(farm, true).pending_hatch)


# ─── practising an egg ───

func test_an_egg_round_is_five_questions_of_one_family_at_the_nest() -> void:
	var plan := RoundPresets.egg(7)
	assert_eq([plan.context, plan.questions, plan.family], [SessionContext.EGG, 5, 7])
	assert_true(Coins.context_earns_coins(plan.context))


func test_an_egg_round_asks_only_its_familys_facts_at_the_nest() -> void:
	var built := await _loaded()
	var first: Result = built.game.start_egg("egg-2")
	assert_true(first.ok, first.error)
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, RoundPresets.EGG_QUESTIONS, false])
	var families := []
	while built.game.current_question() != null:
		families.append(FactTable.get_fact(built.game.current_question().fact_id).family)
		built.clock.advance(FLUENT_MS)
		await built.game.answer(Harness.correct_answer_to(built.game.current_question()))
	assert_eq(families, [2, 2, 2, 2, 2])
	var session_log: Dictionary = (await built.game.end_round()).value
	assert_eq([session_log.context, session_log.family], [SessionContext.EGG, 2])


func test_an_egg_round_earns_coins_for_its_answers() -> void:
	var built := await _loaded()
	await _play_egg(built, "egg-2")
	assert_eq(built.game.summary().value.coins, RoundPresets.EGG_QUESTIONS * Coins.COINS_PER_FLUENT)


func test_wrong_answers_earn_no_coins_and_grow_no_egg() -> void:
	var built := await _loaded()
	await _play_egg(built, "egg-2", FLUENT_MS, false)
	assert_eq(built.game.summary().value.coins, 0)
	assert_eq(_egg_progress(built, "egg-2"), 0.0)


func test_fluent_answers_grow_the_egg_and_slow_ones_grow_it_less() -> void:
	var fluent := await _loaded()
	await _play_egg(fluent, "egg-2")
	var slow := await _loaded()
	await _play_egg(slow, "egg-2", SLOW_MS)
	assert_gt(_egg_progress(fluent, "egg-2"), 0.0)
	assert_eq(_egg_progress(slow, "egg-2"), 0.0, "slow-correct holds a fact's box, so the egg does not move")
	assert_lt(slow.game.summary().value.coins, fluent.game.summary().value.coins)


func test_starting_an_egg_alone_moves_nothing() -> void:
	var built := await _loaded()
	built.game.start_egg("egg-2")
	var ended: Result = await built.game.end_round()
	assert_true(ended.ok, ended.error)
	assert_eq(_egg_progress(built, "egg-2"), 0.0, "only graded answers grow an egg")


func test_an_unknown_egg_is_refused_and_writes_nothing() -> void:
	var built := await _loaded()
	for egg_id in ["egg-7", "egg-10", "duck", ""]:
		assert_eq(built.game.start_egg(egg_id).error, Nest.UNKNOWN_EGG, egg_id)
	assert_null(built.game.current_question())
	assert_eq(built.store.saved.size(), 0)


func test_an_egg_ready_to_hatch_is_not_practised() -> void:
	var built := await _loaded(NestFixtures.mastered(Fixtures.fresh_farm(), 2))
	assert_eq(built.game.start_egg("egg-2").error, Nest.READY_TO_HATCH)


func test_an_egg_is_refused_before_load_and_while_a_round_runs() -> void:
	assert_string_contains(Harness.new().game.start_egg("egg-2").error, "load_farm()")
	var built := await _loaded()
	built.game.start_round(RoundPresets.paddock())
	assert_string_contains(built.game.start_egg("egg-2").error, "already active")


func test_goodnight_refuses_an_egg_and_writes_nothing() -> void:
	var built := await _loaded()
	await _play_egg(built, "egg-2")
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC
	var writes := built.store.saved.size()
	assert_eq(built.game.start_egg("egg-2").error, PlaySession.GOODNIGHT)
	assert_null(built.game.current_question())
	assert_eq(built.store.saved.size(), writes)


func test_after_an_egg_round_mixed_practice_still_interleaves() -> void:
	var built := await _loaded()
	await _play_egg(built, "egg-2")
	var next: Question = built.game.start_round(RoundPresets.paddock()).value
	assert_ne(FactTable.get_fact(next.fact_id).family, 2, "five 2s in a row: the next mixed question is another family")


# ─── the hatch hand-off ───

func test_a_mastered_egg_waits_for_the_round_to_close_then_waits_for_hatch() -> void:
	var built := await _loaded(NestFixtures.one_answer_from_hatching(Fixtures.fresh_farm(), 2))
	built.game.start_egg("egg-2")
	built.clock.advance(FLUENT_MS)
	await built.game.answer(Harness.correct_answer_to(built.game.current_question()))
	assert_true(_nest(built).eggs[0].ready_to_hatch, "mastered mid-round")
	assert_null(_nest(built).pending_hatch, "no ceremony mid-round")
	await _answer_all(built)
	assert_null(_nest(built).pending_hatch, "nor before end_round")
	await built.game.end_round()
	assert_eq(_nest(built).pending_hatch.id, "egg-2")
	var reloaded := await _loaded(built.store.stored)
	assert_eq(_nest(reloaded).pending_hatch.id, "egg-2", "a reload before the ceremony keeps the egg waiting")


func test_hatch_adds_the_animal_to_the_barn_and_empties_the_egg() -> void:
	var built := await _loaded(NestFixtures.mastered(Fixtures.fresh_farm(), 2))
	var coins: int = built.game.summary().value.coins
	var hatched: Result = await built.game.hatch("egg-2")
	assert_true(hatched.ok, hatched.error)
	var duck: AnimalSummary = hatched.value
	assert_eq([duck.id, duck.species, duck.health, duck.tasks_due], ["duck", Species.DUCK, AnimalHealth.START, CareTask.ALL])
	var nest := _nest(built)
	assert_eq([nest.eggs.size(), nest.pending_hatch, nest.hatched], [0, null, ["duck"] as Array[String]])
	assert_eq(built.game.barn().value.animals.size(), Species.STARTING.size() + 1)
	assert_eq(built.store.stored.animals.back().id, "duck", "saved")
	assert_eq(built.game.summary().value.coins, coins, "hatching mints no coins")


func test_a_hatched_animal_can_be_cared_for() -> void:
	var built := await _loaded(NestFixtures.mastered(Fixtures.fresh_farm(), 2))
	await built.game.hatch("egg-2")
	var started := built.game.start_care("duck", CareTask.WATER)
	assert_true(started.ok, started.error)


func test_hatch_is_refused_until_the_egg_is_ready_and_writes_nothing() -> void:
	var built := await _loaded(NestFixtures.one_answer_from_hatching(Fixtures.fresh_farm(), 2))
	assert_eq((await built.game.hatch("egg-2")).error, Nest.NOT_READY)
	assert_eq((await built.game.hatch("egg-9")).error, Nest.UNKNOWN_EGG)
	assert_eq(built.store.saved.size(), 0)
	assert_eq(built.game.barn().value.animals.size(), Species.STARTING.size())


func test_hatch_is_refused_before_load_and_while_a_round_runs() -> void:
	assert_string_contains((await Harness.new().game.hatch("egg-2")).error, "load_farm()")
	var built := await _loaded(NestFixtures.mastered(Fixtures.fresh_farm(), 2))
	built.game.start_round(RoundPresets.paddock())
	assert_string_contains((await built.game.hatch("egg-2")).error, "round is active")


func test_a_refused_save_leaves_the_egg_in_the_nest() -> void:
	var built := await _loaded(NestFixtures.mastered(Fixtures.fresh_farm(), 2))
	built.store.refuse_next = true
	assert_false((await built.game.hatch("egg-2")).ok)
	assert_eq(_nest(built).pending_hatch.id, "egg-2")
	assert_eq(built.game.barn().value.animals.size(), Species.STARTING.size())


func test_an_egg_earned_before_goodnight_still_hatches_after_it() -> void:
	var built := await _loaded(NestFixtures.one_answer_from_hatching(Fixtures.fresh_farm(), 2))
	await _play_egg(built, "egg-2")
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC
	assert_eq(built.game.start_egg("egg-2").error, PlaySession.GOODNIGHT)
	assert_true((await built.game.hatch("egg-2")).ok)


func test_after_the_last_egg_the_nest_is_done() -> void:
	var almost_everyone: Array = Species.ALL.filter(func(kind: String) -> bool: return kind != Species.DUCK)
	var farm := NestFixtures.mastered(NestFixtures.with_animals(Fixtures.fresh_farm(), almost_everyone), 2)
	var built := await _loaded(farm)
	assert_false(_nest(built).all_hatched)
	await built.game.hatch("egg-2")
	var nest := _nest(built)
	assert_eq([nest.eggs.size(), nest.pending_hatch, nest.all_hatched], [0, null, true])
	assert_eq(built.game.start_egg("egg-2").error, Nest.UNKNOWN_EGG)
	assert_true(built.game.start_round(RoundPresets.paddock()).ok, "practice carries on")
