## An AudioBus that remembers what it was asked to play — `recordingAudioBus()`
## in `test-fakes.ts`. A muted bus records nothing, as a muted speaker plays nothing.
extends AudioBus

var played: Array[String] = []
var muted := false


func play(sound_id: String) -> void:
	if not muted:
		played.append(sound_id)


func set_muted(next: bool) -> void:
	muted = next


func is_muted() -> bool:
	return muted
