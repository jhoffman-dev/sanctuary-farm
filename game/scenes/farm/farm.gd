## The placeholder farm: wires the farm game to the keeper, the pad and the
## HUD and plays the animals' idle clips. This script is also the composition
## root — the one place adapters are built and handed to the application, as
## `apps/web/src/composition/` is for the web client. It holds no game rules:
## the keeper says where she stopped, HotspotArrivals says what that opens.
extends Node3D

## Every character that should breathe while the farm is idle.
const IDLE_CLIP := "idle"

var _game: FarmGame
var _arrivals: HotspotArrivals

@onready var _pad: NumberPad = %NumberPad
@onready var _hud: Hud = %Hud
@onready var _keeper: KeeperController = %Keeper


func _ready() -> void:
	_game = FarmGame.new(UserFileSaveStore.new(), SystemClock.new(), EntropySeed.fresh_rng())
	_arrivals = HotspotArrivals.new(_game)
	_pad.answer_submitted.connect(_on_answer_submitted)
	_keeper.page_prefers_reduced_motion = WebPage.prefers_reduced_motion()
	_keeper.set_off.connect(_on_keeper_set_off)
	_keeper.stopped.connect(_on_keeper_stopped)
	if not WebPage.prefers_reduced_motion():
		_play_idle_clips()
	_close_pad()
	_publish_hotspots()
	WebPage.publish("sfKeeper", "standing")
	var summary := await _game.load_farm()
	_show_coins(summary.coins)


func _on_keeper_set_off() -> void:
	_arrivals.keeper_moved()
	WebPage.publish("sfKeeper", "walking")


func _on_keeper_stopped(at: Vector3) -> void:
	var place := HotspotArea.id_at(get_tree(), at)
	WebPage.publish("sfKeeper", "standing")
	WebPage.publish("sfKeeperAt", place)
	if place.is_empty():
		return
	var arrived := await _arrivals.arrive_at(place)
	if not arrived.ok:
		push_warning(arrived.error)
		return
	var outcome: ArrivalOutcome = arrived.value
	if outcome.kind == ArrivalOutcome.PRACTICE:
		_open_pad(_game.current_question())


func _on_answer_submitted(value: int) -> void:
	var answered := await _game.answer(value)
	if not answered.ok:
		# A double tap or a refused save: the question on screen is still the
		# one in flight, so the pad simply stays on it.
		push_warning(answered.error)
		return
	var feedback: AnswerFeedback = answered.value
	_pad.show_result(feedback)
	_show_coins(_game.summary().value.coins)
	if feedback.next != null:
		_show_question(feedback.next)
		return
	var ended := await _game.end_round()
	if not ended.ok:
		push_warning(ended.error)
	_close_pad()


func _open_pad(question: Question) -> void:
	_pad.visible = true
	_show_question(question)
	WebPage.publish("sfPad", "open")


func _close_pad() -> void:
	_pad.visible = false
	WebPage.publish("sfPad", "closed")


func _show_question(question: Question) -> void:
	_pad.show_question(question)
	WebPage.publish("sfQuestion", question.fact_id)


func _show_coins(coins: int) -> void:
	_hud.show_coins(coins)
	WebPage.publish("sfCoins", str(coins))


## Where each hotspot sits on screen, as fractions of the view, so the web
## smoke can tap one without knowing the camera.
func _publish_hotspots() -> void:
	var camera := get_viewport().get_camera_3d()
	var view := get_viewport().get_visible_rect().size
	var on_screen := {}
	for area: HotspotArea in get_tree().get_nodes_in_group(HotspotArea.GROUP):
		var point := camera.unproject_position(area.global_position)
		on_screen[area.hotspot_id] = [point.x / view.x, point.y / view.y]
	WebPage.publish("sfHotspots", JSON.stringify(on_screen))


## Kenney's clips import without a loop flag, so idle is set to loop here.
## Under reduced motion this is skipped and the characters hold their rest pose.
## The keeper is left out: her AnimationTree blends idle and walk itself.
func _play_idle_clips() -> void:
	for player: AnimationPlayer in find_children("*", "AnimationPlayer", true, false):
		if _keeper.is_ancestor_of(player):
			continue
		if player.has_animation(IDLE_CLIP):
			player.get_animation(IDLE_CLIP).loop_mode = Animation.LOOP_LINEAR
			player.play(IDLE_CLIP)
