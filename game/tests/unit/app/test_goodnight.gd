## FarmGame's session clock with fake adapters (game rule 4): after five
## minutes no new round, care or purchase starts and the scene is told
## goodnight; a running round always finishes; reloading the page cannot
## restart the session; a rest or a new day can; and session() is the
## read-model the goodnight scene binds to.
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const DAY := 20_000
const MINUTE := 60_000
## 10:00 UTC on DAY.
const MORNING := DAY * CareDay.MSEC_PER_DAY + 10 * 3_600_000
const FLUENT_MS := 1500


func _loaded(farm: Variant = null, at: int = MORNING) -> Harness:
	var built := Harness.new(farm, 1, at)
	await built.game.load_farm()
	return built


## The same saved farm opened again, as a page reload would, at the same moment.
func _reloaded(built: Harness) -> Harness:
	return await _loaded(built.store.stored, built.clock.now)


func _paddock() -> RoundPlan:
	return RoundPlan.new(SessionContext.PADDOCK, 3)


## Starts a paddock round, answers it correctly and fluently, and closes it.
func _play_a_round(built: Harness) -> void:
	var started := built.game.start_round(_paddock())
	assert_true(started.ok, started.error)
	await _answer_all(built)
	var ended: Result = await built.game.end_round()
	assert_true(ended.ok, ended.error)


func _answer_all(built: Harness) -> void:
	while built.game.current_question() != null:
		built.clock.advance(FLUENT_MS)
		var answered: Result = await built.game.answer(Harness.correct_answer_to(built.game.current_question()))
		assert_true(answered.ok, answered.error)


## Plays a round, then lets the clock run until the session's time is used.
func _tired(built: Harness) -> void:
	await _play_a_round(built)
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC


func _session(built: Harness) -> SessionSummary:
	return built.game.session().value


# ─── the read-model ───

func test_the_session_is_refused_before_load() -> void:
	assert_string_contains(Harness.new().game.session().error, "load_farm()")


func test_a_fresh_farm_has_a_whole_session_ahead_and_nothing_to_tally() -> void:
	var built := await _loaded()
	var session := _session(built)
	assert_eq([session.length_minutes, session.minutes_used, session.minutes_left], [5.0, 0.0, 5.0])
	assert_eq([session.winding_down, session.goodnight], [false, false])
	assert_eq([session.answered_today, session.correct_today, session.fluent_today, session.animals_cared_for_today], [0, 0, 0, 0])


func test_the_session_counts_from_the_first_round_and_winds_down_in_the_last_minute() -> void:
	var built := await _loaded()
	built.clock.advance(10 * MINUTE)
	assert_eq(_session(built).minutes_used, 0.0, "walking about before the first round is not counted")
	var session_start := built.clock.now
	await _play_a_round(built)
	built.clock.now = session_start + 3 * MINUTE
	assert_eq([_session(built).minutes_used, _session(built).minutes_left, _session(built).winding_down], [3.0, 2.0, false])
	built.clock.now = session_start + 4 * MINUTE
	assert_eq([_session(built).minutes_left, _session(built).winding_down, _session(built).goodnight], [1.0, true, false])


func test_goodnight_tallies_todays_answers_and_care() -> void:
	var built := await _loaded()
	await _play_a_round(built)
	assert_true(built.game.start_care("cow", CareTask.PLAY).ok)
	await _answer_all(built)
	await built.game.end_round()
	var session := _session(built)
	var care_questions := CareTask.questions_for(CareTask.PLAY)
	assert_eq([session.answered_today, session.correct_today, session.fluent_today], [3 + care_questions, 3 + care_questions, 3 + care_questions])
	assert_eq(session.animals_cared_for_today, 1)


func test_the_summary_reads_faster_facts_from_the_round_logs() -> void:
	var yesterday_at := MORNING - CareDay.MSEC_PER_DAY
	var slow := {"fact_id": "6x7", "given": 42, "correct": true, "latency_ms": 4000.0, "outcome": Outcome.SLOW, "asked_at": 1}
	var fast := FarmSave.with_changes(slow, {"latency_ms": 1200.0, "outcome": Outcome.FLUENT, "asked_at": 2})
	var yesterdays := {"started_at": yesterday_at, "ended_at": yesterday_at, "context": SessionContext.PADDOCK, "family": null, "entries": [slow]}
	var todays := FarmSave.with_changes(yesterdays, {"started_at": MORNING, "ended_at": MORNING, "entries": [fast]})
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(), {"sessions": [yesterdays, todays]})
	var summary := SessionSummary.of(farm, MORNING, 0)
	assert_eq(summary.faster_facts, ["6x7"] as Array[String])
	assert_eq([summary.answered_today, summary.fluent_today], [1, 1])


# ─── goodnight ───

func test_after_five_minutes_no_new_round_starts_and_the_reason_is_goodnight() -> void:
	var built := await _loaded()
	await _play_a_round(built)
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC - 1
	assert_false(_session(built).goodnight)
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC
	assert_true(_session(built).goodnight)
	assert_eq(_session(built).minutes_left, 0.0)
	var refused := built.game.start_round(_paddock())
	assert_eq([refused.ok, refused.error], [false, PlaySession.GOODNIGHT])
	assert_null(built.game.current_question(), "nothing was served")


func test_care_is_refused_after_goodnight_and_writes_nothing() -> void:
	var built := await _loaded()
	await _tired(built)
	var writes := built.store.saved.size()
	var refused := built.game.start_care("cow", CareTask.FEED)
	assert_eq([refused.ok, refused.error], [false, PlaySession.GOODNIGHT])
	assert_null(built.game.care_in_progress())
	assert_eq(built.store.saved.size(), writes)


func test_the_feed_shed_is_shut_after_goodnight_and_spends_nothing() -> void:
	var built := await _loaded(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 50}))
	await _tired(built)
	var coins_before: int = built.game.summary().value.coins
	var refused: Result = await built.game.buy_feed()
	assert_eq([refused.ok, refused.error], [false, PlaySession.GOODNIGHT])
	assert_eq(built.game.summary().value.coins, coins_before)


func test_buying_any_offer_is_refused_after_goodnight_and_writes_nothing() -> void:
	var built := await _loaded(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 50}))
	await _tired(built)
	var writes := built.store.saved.size()
	var refused: Result = await built.game.buy(FeedShed.FEED_SACK)
	assert_eq([refused.ok, refused.error], [false, PlaySession.GOODNIGHT])
	assert_eq(built.store.saved.size(), writes)
	assert_eq(built.game.shop().value.coins, 50, "no coins were spent")


func test_after_goodnight_the_shop_shows_every_offer_shut_for_the_night() -> void:
	var built := await _loaded(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 50}))
	await _tired(built)
	for offer: OfferSummary in built.game.shop().value.offers:
		assert_eq([offer.affordable, offer.reason], [false, PlaySession.GOODNIGHT])


func test_buying_is_not_play_and_does_not_start_the_session_clock() -> void:
	var built := await _loaded(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 50}))
	var bought: Result = await built.game.buy(FeedShed.FEED_SACK)
	assert_true(bought.ok, bought.error)
	assert_null(built.store.stored.play_session, "buying left no play mark")
	built.clock.advance(10 * MINUTE)
	assert_eq(_session(built).minutes_used, 0.0)


func test_a_round_running_at_the_limit_always_finishes() -> void:
	var built := await _loaded()
	await _play_a_round(built)
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC - 1000
	assert_true(built.game.start_round(_paddock()).ok)
	built.clock.advance(2 * MINUTE)
	assert_true(_session(built).goodnight, "the time ran out mid-round")
	await _answer_all(built)
	assert_true(built.game.round_progress().complete, "every question was still graded")
	var ended: Result = await built.game.end_round()
	assert_true(ended.ok, ended.error)
	assert_eq(ended.value.entries.size(), 3)
	assert_eq(built.game.start_round(_paddock()).error, PlaySession.GOODNIGHT)


# ─── reloading the page ───

func test_reloading_the_page_does_not_restart_the_session() -> void:
	var built := await _loaded()
	await _play_a_round(built)
	built.clock.now = MORNING + 3 * MINUTE
	assert_true(built.game.start_round(_paddock()).ok)
	await _answer_all(built)
	var reloaded := await _reloaded(built)
	assert_almost_eq(_session(reloaded).minutes_used, _session(built).minutes_used, 0.0001)
	assert_gt(_session(reloaded).minutes_used, 3.0)


func test_reloading_after_goodnight_is_still_goodnight() -> void:
	var built := await _loaded()
	await _tired(built)
	var reloaded := await _reloaded(built)
	assert_true(_session(reloaded).goodnight)
	assert_eq(reloaded.game.start_round(_paddock()).error, PlaySession.GOODNIGHT)


func test_reloading_mid_round_keeps_the_time_the_round_used() -> void:
	var built := await _loaded()
	await _play_a_round(built)
	built.clock.now = MORNING + PlaySession.LENGTH_MSEC - 1000
	assert_true(built.game.start_round(_paddock()).ok)
	built.clock.advance(FLUENT_MS)
	await built.game.answer(Harness.correct_answer_to(built.game.current_question()))
	var reloaded := await _reloaded(built)
	assert_true(_session(reloaded).goodnight, "the answer saved the session; the reload cannot drop it")
	assert_eq(reloaded.game.start_round(_paddock()).error, PlaySession.GOODNIGHT)


# ─── the next session ───

func test_after_a_rest_a_new_session_starts() -> void:
	var built := await _loaded()
	await _tired(built)
	var last_played: int = built.store.stored.play_session.last_played_at
	built.clock.now = last_played + PlaySession.REST_MSEC - 1
	assert_eq(built.game.start_round(_paddock()).error, PlaySession.GOODNIGHT)
	built.clock.now = last_played + PlaySession.REST_MSEC
	assert_false(_session(built).goodnight)
	assert_eq(_session(built).minutes_used, 0.0)
	assert_true(built.game.start_round(_paddock()).ok)


func test_asking_to_play_after_goodnight_never_delays_the_next_session() -> void:
	var built := await _loaded()
	await _tired(built)
	var last_played: int = built.store.stored.play_session.last_played_at
	for minutes in [5, 10, 29]:
		built.clock.now = last_played + minutes * MINUTE
		assert_eq(built.game.start_round(_paddock()).error, PlaySession.GOODNIGHT)
	built.clock.now = last_played + PlaySession.REST_MSEC
	assert_true(built.game.start_round(_paddock()).ok)


func test_the_next_local_day_starts_a_new_session_without_a_rest() -> void:
	var midnight := (DAY + 1) * CareDay.MSEC_PER_DAY
	var built := await _loaded(null, midnight - 10 * MINUTE)
	await _play_a_round(built)
	built.clock.now = midnight - 1
	assert_true(_session(built).goodnight, "still today, and no rest yet")
	built.clock.now = (DAY + 1) * CareDay.MSEC_PER_DAY
	assert_false(_session(built).goodnight, "midnight: a new day")
	assert_true(built.game.start_round(_paddock()).ok)


# ─── a clock that steps backwards ───

func test_a_clock_set_back_grants_no_extra_time_and_breaks_nothing() -> void:
	var built := await _loaded()
	await _play_a_round(built)
	built.clock.now = MORNING + 4 * MINUTE
	assert_true(built.game.start_round(_paddock()).ok)
	await _answer_all(built)
	await built.game.end_round()
	var used_before := _session(built).minutes_used
	built.clock.now = MORNING - 60 * MINUTE
	assert_almost_eq(_session(built).minutes_used, used_before, 0.0001, "nothing handed back")
	assert_true(built.game.start_round(_paddock()).ok, "the minute that was left is still there")
	await _answer_all(built)
	await built.game.end_round()
	built.clock.advance(MINUTE)
	assert_true(_session(built).goodnight, "real time counts on from the new reading")
	assert_eq(built.game.start_round(_paddock()).error, PlaySession.GOODNIGHT)
