## The placeholder farm: wires the farm game to the pad and the HUD and plays
## the characters' idle clips. This script is also the composition root — the
## one place adapters are built and handed to the application, as
## `apps/web/src/composition/` is for the web client. It holds no game rules:
## the placeholder has no walking yet, so the keeper "arrives" at the paddock
## on load and again whenever a round is done.
extends Node3D

## Every character that should breathe while the farm is idle.
const IDLE_CLIP := "idle"
const PADDOCK := "paddock"

var _game: FarmGame
var _arrivals: HotspotArrivals
var _audio: FarmAudio

@onready var _pad: NumberPad = %NumberPad
@onready var _hud: Hud = %Hud


func _ready() -> void:
	_game = FarmGame.new(UserFileSaveStore.new(), SystemClock.new(), EntropySeed.fresh_rng())
	_arrivals = HotspotArrivals.new(_game)
	_audio = FarmAudio.new(_game, GodotAudioBus.new(self))
	_pad.answer_submitted.connect(_on_answer_submitted)
	_hud.mute_toggled.connect(_on_mute_toggled)
	if not WebPage.prefers_reduced_motion():
		_play_idle_clips()
	var summary := await _game.load_farm()
	_audio.restore(summary)
	_hud.show_muted(summary.muted)
	_show_coins(summary.coins)
	await _open_paddock()


func _on_answer_submitted(value: int) -> void:
	var answered := await _game.answer(value)
	if not answered.ok:
		# A double tap or a refused save: the question on screen is still the
		# one in flight, so the pad simply stays on it.
		push_warning(answered.error)
		return
	var feedback: AnswerFeedback = answered.value
	_audio.play_feedback(feedback)
	_pad.show_result(feedback)
	_show_coins(_game.summary().value.coins)
	if feedback.next != null:
		_show_question(feedback.next)
		return
	var ended := await _game.end_round()
	if not ended.ok:
		push_warning(ended.error)
	await _open_paddock()


func _on_mute_toggled() -> void:
	var toggled := await _audio.toggle_mute()
	if not toggled.ok:
		# The bus already obeyed; only remembering it for next visit failed.
		push_warning(toggled.error)
	_hud.show_muted(_audio.is_muted())


func _open_paddock() -> void:
	var arrived := await _arrivals.arrive_at(PADDOCK)
	if not arrived.ok:
		push_warning(arrived.error)
		return
	_show_question(_game.current_question())


func _show_question(question: Question) -> void:
	_pad.show_question(question)
	WebPage.publish("sfQuestion", question.fact_id)


func _show_coins(coins: int) -> void:
	_hud.show_coins(coins)
	WebPage.publish("sfCoins", str(coins))


## Kenney's clips import without a loop flag, so idle is set to loop here.
## Under reduced motion this is skipped and the characters hold their rest pose.
func _play_idle_clips() -> void:
	for player: AnimationPlayer in find_children("*", "AnimationPlayer", true, false):
		if player.has_animation(IDLE_CLIP):
			player.get_animation(IDLE_CLIP).loop_mode = Animation.LOOP_LINEAR
			player.play(IDLE_CLIP)
