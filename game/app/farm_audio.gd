## What the farm sounds like, and whether it sounds at all — the AudioBus half
## of `farm-game.ts` (which played graded sounds and synced mute itself). Kept
## beside FarmGame rather than inside it: FarmGame already decides which sounds
## an answer makes (AnswerFeedback.sounds), this only plays them and keeps the
## bus's mute in step with the saved setting.
class_name FarmAudio
extends RefCounted

var _game: FarmGame
var _bus: AudioBus


func _init(game: FarmGame, bus: AudioBus) -> void:
	_game = game
	_bus = bus


## Puts the bus in the loaded farm's mute state. Call after load_farm, before
## any sound: a player who muted last visit hears nothing this visit.
func restore(summary: FarmSummary) -> void:
	_bus.set_muted(summary.muted)


## The answer's sounds, in the order the application chose.
func play_feedback(feedback: AnswerFeedback) -> void:
	for sound_id in feedback.sounds:
		_bus.play(sound_id)


func is_muted() -> bool:
	return _bus.is_muted()


## Flips mute and saves it; the value is the new muted state. The bus obeys at
## once — a child who taps mute expects silence now, not after the save — so a
## refused save (the failure returned) still leaves this visit as asked; only
## the next load would forget it. Refused before load_farm, bus untouched.
func toggle_mute() -> Result:
	if not _game.summary().ok:
		return _game.summary()
	var muted := not _bus.is_muted()
	_bus.set_muted(muted)
	var saved: Result = await _game.set_muted(muted)
	if not saved.ok:
		return saved
	return Result.success(muted)
