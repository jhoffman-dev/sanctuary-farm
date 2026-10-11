## Port: sound output — `packages/application/src/ports/audio-bus.ts`.
## Best-effort: a bus that cannot play (no device, a locked browser context,
## an unknown id) stays silent and never fails the caller.
## Adapters: GodotAudioBus (adapters/). Tests: RecordingAudioBus (tests/fakes/).
class_name AudioBus
extends RefCounted


## Plays a sound by its id (a Sounds constant). Ignored while muted.
func play(_sound_id: String) -> void:
	push_error("AudioBus.play() is abstract; inject an adapter or a fake")


## Muting is immediate: anything still sounding stops.
func set_muted(_muted: bool) -> void:
	push_error("AudioBus.set_muted() is abstract; inject an adapter or a fake")


func is_muted() -> bool:
	push_error("AudioBus.is_muted() is abstract; inject an adapter or a fake")
	return false
