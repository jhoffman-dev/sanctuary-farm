## hotspot-arrival.test.ts, with SF-89's arrival that waits for a save still
## landing (the base branch's version refused instead; see the PR notes).
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")


func _loaded() -> Harness:
	var built := Harness.new()
	await built.game.load_farm()
	return built


func _arrive_into(arrivals: HotspotArrivals, place: String, outcomes: Array) -> void:
	outcomes.append(await arrivals.arrive_at(place))


func test_starts_a_paddock_practice_round_at_the_paddock() -> void:
	var built := await _loaded()
	var arrived: Result = await HotspotArrivals.new(built.game).arrive_at("paddock")
	assert_eq([arrived.value.kind, arrived.value.started], [ArrivalOutcome.PRACTICE, true])
	assert_not_null(built.game.current_question())
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, RoundPresets.PADDOCK_QUESTIONS, false])


func test_keeps_the_round_already_running_instead_of_starting_another() -> void:
	var built := await _loaded()
	var arrivals := HotspotArrivals.new(built.game)
	await arrivals.arrive_at("paddock")
	var in_flight := built.game.current_question()
	var again: Result = await arrivals.arrive_at("paddock")
	assert_eq([again.value.kind, again.value.started], [ArrivalOutcome.PRACTICE, false])
	assert_true(is_same(built.game.current_question(), in_flight))


func test_starts_a_fresh_round_once_the_last_one_has_ended() -> void:
	var built := await _loaded()
	var arrivals := HotspotArrivals.new(built.game)
	await arrivals.arrive_at("paddock")
	await built.game.end_round()
	assert_true((await arrivals.arrive_at("paddock")).value.started)


func test_has_nothing_to_open_at_the_other_places_yet_and_starts_no_round() -> void:
	for place in ["barn", "feed-shed", "nest", "training-ring", "petting-zoo", "farmhouse"]:
		var built := await _loaded()
		var arrived: Result = await HotspotArrivals.new(built.game).arrive_at(place)
		assert_eq([arrived.value.kind, arrived.value.place], [ArrivalOutcome.COMING_SOON, place])
		assert_eq(built.game.round_progress().total, 0, place)


func test_waits_for_a_save_still_landing_then_opens_practice() -> void:
	# Arriving just after toggling mute used to hit start_round's "save still in
	# progress" refusal, and the keeper stood at the gate with nothing opening.
	var built := await _loaded()
	built.store.hold_writes = true
	built.game.set_muted(true)
	var outcomes := []
	_arrive_into(HotspotArrivals.new(built.game), "paddock", outcomes)
	assert_eq(outcomes.size(), 0, "waiting for the save")
	built.store.release()
	assert_eq(outcomes.size(), 1)
	assert_true(outcomes[0].value.started)
	assert_true(built.store.stored.settings.muted)
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, RoundPresets.PADDOCK_QUESTIONS, false])


func test_still_opens_practice_when_the_save_it_waited_for_failed() -> void:
	var built := await _loaded()
	built.store.hold_writes = true
	built.store.refuse_writes = true
	built.game.set_muted(true)
	var outcomes := []
	_arrive_into(HotspotArrivals.new(built.game), "paddock", outcomes)
	built.store.release()
	assert_true(outcomes[0].value.started)
	assert_false(built.game.summary().value.muted, "the refused mute never landed")


func test_opens_one_round_for_the_latest_of_two_arrivals_waiting_on_the_same_save() -> void:
	var built := await _loaded()
	built.store.hold_writes = true
	built.game.set_muted(true)
	var arrivals := HotspotArrivals.new(built.game)
	var outcomes := []
	_arrive_into(arrivals, "paddock", outcomes)
	_arrive_into(arrivals, "paddock", outcomes)
	built.store.release()
	assert_eq(
		outcomes.map(func(arrived: Result) -> Array: return [arrived.value.kind, arrived.value.started]),
		[[ArrivalOutcome.MOVED_ON, false], [ArrivalOutcome.PRACTICE, true]]
	)
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, RoundPresets.PADDOCK_QUESTIONS, false])


func test_rejects_when_the_farm_has_not_loaded_as_starting_a_round_would() -> void:
	var arrived: Result = await HotspotArrivals.new(Harness.new().game).arrive_at("paddock")
	assert_string_contains(arrived.error, "load_farm()")


func test_drops_a_paddock_arrival_once_the_keeper_has_stopped_somewhere_newer() -> void:
	# Codex on #130: with a slow save she can reach the paddock, walk on and stop
	# at the barn before the save lands; practice must not open behind her.
	var built := await _loaded()
	built.store.hold_writes = true
	built.game.set_muted(true)
	var arrivals := HotspotArrivals.new(built.game)
	var outcomes := []
	_arrive_into(arrivals, "paddock", outcomes)
	await arrivals.arrive_at("barn")
	built.store.release()
	assert_eq(outcomes.size(), 1)
	assert_eq([outcomes[0].value.kind, outcomes[0].value.place], [ArrivalOutcome.MOVED_ON, "paddock"])
	assert_false(outcomes[0].value.started)
	assert_eq(built.game.round_progress().total, 0, "no round opened behind her")


func test_drops_a_paddock_arrival_once_the_keeper_sets_off_before_the_save_lands() -> void:
	var built := await _loaded()
	built.store.hold_writes = true
	built.game.set_muted(true)
	var arrivals := HotspotArrivals.new(built.game)
	var outcomes := []
	_arrive_into(arrivals, "paddock", outcomes)
	arrivals.keeper_moved()
	built.store.release()
	assert_eq(outcomes[0].value.kind, ArrivalOutcome.MOVED_ON)
	assert_eq(built.game.round_progress().total, 0)


func test_opens_practice_when_she_comes_back_and_stops_at_the_paddock_again() -> void:
	var built := await _loaded()
	built.store.hold_writes = true
	built.game.set_muted(true)
	var arrivals := HotspotArrivals.new(built.game)
	var outcomes := []
	_arrive_into(arrivals, "paddock", outcomes)
	arrivals.keeper_moved()
	_arrive_into(arrivals, "paddock", outcomes)
	built.store.release()
	assert_eq(outcomes.map(func(arrived: Result) -> String: return arrived.value.kind), [ArrivalOutcome.MOVED_ON, ArrivalOutcome.PRACTICE])
	assert_true(outcomes[1].value.started)


func test_setting_off_after_practice_opened_leaves_the_round_running() -> void:
	var built := await _loaded()
	var arrivals := HotspotArrivals.new(built.game)
	await arrivals.arrive_at("paddock")
	arrivals.keeper_moved()
	assert_eq(Harness.progress_of(built.game.round_progress()), [1, RoundPresets.PADDOCK_QUESTIONS, false])
