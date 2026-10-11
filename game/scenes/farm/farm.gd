## The placeholder farm: wires the practice use-case to the pad and the HUD and
## plays the characters' idle clips. This script is also the composition root —
## the one place adapters are built and handed to the application, as
## `apps/web/src/composition/` is for the web client. It holds no game rules.
extends Node3D

## Every character that should breathe while the farm is idle.
const IDLE_CLIP := "idle"

var _session: PracticeSession
var _question: QuestionView

@onready var _pad: NumberPad = %NumberPad
@onready var _hud: Hud = %Hud


func _ready() -> void:
	_session = PracticeSession.new(UserFileSaveStore.new(), SystemClock.new(), EntropySeed.fresh_rng())
	_show_coins(_session.start())
	_pad.answer_submitted.connect(_on_answer_submitted)
	if not WebPage.prefers_reduced_motion():
		_play_idle_clips()
	_ask_next_question()


func _on_answer_submitted(value: int) -> void:
	var result := _session.submit_answer(value)
	if result == null:
		return
	_pad.show_result(_question, result)
	_show_coins(result.total_coins)
	_ask_next_question()


func _ask_next_question() -> void:
	_question = _session.next_question()
	_pad.show_question(_question)
	WebPage.publish("sfQuestion", "%dx%d" % [_question.a, _question.b])


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
