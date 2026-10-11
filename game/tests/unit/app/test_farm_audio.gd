## FarmAudio against a recording bus: the answer's sounds reach the AudioBus
## port in order, and mute is obeyed at once and survives a reload.
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const RecordingAudioBus := preload("res://tests/fakes/recording_audio_bus.gd")

var _built: Harness
var _bus: RecordingAudioBus
var _audio: FarmAudio


func before_each() -> void:
	_built = Harness.new()
	_bus = RecordingAudioBus.new()
	_audio = FarmAudio.new(_built.game, _bus)


func _feedback_with(sounds: Array[String]) -> AnswerFeedback:
	var feedback := AnswerFeedback.new()
	feedback.sounds = sounds
	return feedback


func _muted_farm() -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(), {"settings": {"muted": true, "max_table": 12}})


func test_plays_the_feedbacks_sounds_in_order() -> void:
	_audio.play_feedback(_feedback_with([Sounds.FLUENT, Sounds.HATCH]))
	assert_eq(_bus.played, [Sounds.FLUENT, Sounds.HATCH] as Array[String])


func test_a_real_answer_reaches_the_bus() -> void:
	await _built.game.load_farm()
	assert_true(_built.game.start_round(RoundPlan.new(SessionContext.PADDOCK, 2)).ok)
	var answered: Result = await _built.game.answer(-1)
	_audio.play_feedback(answered.value)
	assert_eq(_bus.played, [Sounds.WRONG] as Array[String])


func test_restore_mutes_the_bus_when_the_save_was_muted() -> void:
	var built := Harness.new(_muted_farm())
	var audio := FarmAudio.new(built.game, _bus)
	audio.restore(await built.game.load_farm())
	assert_true(audio.is_muted())
	audio.play_feedback(_feedback_with([Sounds.CORRECT]))
	assert_eq(_bus.played, [] as Array[String])


func test_restore_unmutes_a_bus_left_muted() -> void:
	_bus.muted = true
	_audio.restore(await _built.game.load_farm())
	assert_false(_audio.is_muted())


func test_toggle_mutes_at_once_and_saves_it() -> void:
	await _built.game.load_farm()
	var toggled: Result = await _audio.toggle_mute()
	assert_true(toggled.ok, toggled.error)
	assert_true(toggled.value)
	assert_true(_bus.is_muted())
	assert_true(_built.store.stored.settings.muted)


func test_toggling_twice_turns_sound_back_on() -> void:
	await _built.game.load_farm()
	await _audio.toggle_mute()
	var toggled: Result = await _audio.toggle_mute()
	assert_false(toggled.value)
	assert_false(_bus.is_muted())
	assert_false(_built.store.stored.settings.muted)


func test_mute_survives_a_reload() -> void:
	await _built.game.load_farm()
	await _audio.toggle_mute()
	var reloaded := Harness.new(_built.store.stored)
	var bus := RecordingAudioBus.new()
	FarmAudio.new(reloaded.game, bus).restore(await reloaded.game.load_farm())
	assert_true(bus.is_muted())


func test_toggle_before_load_is_refused_and_leaves_the_bus_alone() -> void:
	var toggled: Result = await _audio.toggle_mute()
	assert_false(toggled.ok)
	assert_eq(toggled.error, FarmGame.NOT_LOADED)
	assert_false(_bus.is_muted())


func test_a_refused_save_still_mutes_this_visit_and_reports_the_failure() -> void:
	await _built.game.load_farm()
	_built.store.refuse_writes = true
	var toggled: Result = await _audio.toggle_mute()
	assert_false(toggled.ok)
	assert_true(_bus.is_muted())
	assert_false(_built.game.summary().value.muted)
