## AudioBus on Godot's mixer: the pre-rendered recipes (assets/audio, made by
## tools/render_sounds.mjs) played by a small pool of AudioStreamPlayers on the
## "SFX" bus (default_bus_layout.tres). Translates ids to streams; decides
## nothing about which sound fits a moment.
##
## On the web, browsers hold audio until a user gesture; Godot's web audio
## driver resumes its context on the first tap or key, so a sound asked for
## before that is simply not heard (sound-design.md §5) — never an error.
class_name GodotAudioBus
extends AudioBus

const BUS := &"SFX"
## docs/sound-design.md §6: never more than 8 voices at once.
const VOICES := 8

## Preloaded, not loaded by path, so every file is a visible dependency that
## any export filter keeps, and the first play has no disk wait.
const STREAMS := {
	Sounds.CORRECT: preload("res://assets/audio/correct.ogg"),
	Sounds.FLUENT: preload("res://assets/audio/fluent.ogg"),
	Sounds.WRONG: preload("res://assets/audio/wrong.ogg"),
	Sounds.HATCH: preload("res://assets/audio/hatch.ogg"),
	Sounds.TAP: preload("res://assets/audio/tap.ogg"),
	Sounds.FOOTSTEP: preload("res://assets/audio/footstep.ogg"),
	Sounds.DOOR_OPEN: preload("res://assets/audio/door_open.ogg"),
	Sounds.CHEW: preload("res://assets/audio/chew.ogg"),
}

var _players: Array[AudioStreamPlayer] = []
var _next_voice := 0
var _muted := false


## The players are added under `host`, so they live and die with its scene.
func _init(host: Node) -> void:
	for i in VOICES:
		var player := AudioStreamPlayer.new()
		player.name = "SfxVoice%d" % i
		player.bus = BUS
		host.add_child(player)
		_players.append(player)


## An unknown id is a bug in the caller's data, but audio is best-effort: it
## warns and stays silent rather than stopping the game.
func play(sound_id: String) -> void:
	if _muted:
		return
	if not STREAMS.has(sound_id):
		push_warning("GodotAudioBus: no sound named \"%s\"" % sound_id)
		return
	# Round-robin: with all voices busy, the oldest is cut — never a ninth voice.
	var player := _players[_next_voice]
	_next_voice = (_next_voice + 1) % VOICES
	player.stream = STREAMS[sound_id]
	player.play()
	WebPage.publish("sfSound", sound_id)


func set_muted(muted: bool) -> void:
	_muted = muted
	if muted:
		for player in _players:
			player.stop()


func is_muted() -> bool:
	return _muted


## Whether any voice is sounding right now.
func is_playing() -> bool:
	return _players.any(func(player: AudioStreamPlayer) -> bool: return player.playing)


## The ids this bus can play.
static func sound_ids() -> Array:
	return STREAMS.keys()
