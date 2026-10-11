## GodotAudioBus against Godot's real mixer and the committed OGGs: every
## sound the application can name has a file, every file is within the length
## docs/sound-design.md allows, and mute silences at once.
extends GutTest

const AUDIO_DIR := "res://assets/audio/"
const MANIFEST := "res://assets/audio/manifest.json"
## docs/sound-design.md §6 — kept here, not read from the manifest, so a
## renderer that wrote a wrong limit cannot pass its own files.
const LIMIT_SECONDS := {"feedback": 0.6, "world": 1.0}
const WORLD_SOUNDS: Array[String] = [Sounds.FOOTSTEP, Sounds.DOOR_OPEN, Sounds.CHEW]

var _host: Node
var _bus: GodotAudioBus


func before_each() -> void:
	_host = Node.new()
	add_child_autofree(_host)
	_bus = GodotAudioBus.new(_host)


func _manifest_sounds() -> Array:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(MANIFEST))
	assert_true(parsed is Dictionary, "manifest.json parses")
	return parsed.sounds if parsed is Dictionary else []


func _ogg_files() -> Array[String]:
	var files: Array[String] = []
	for file in DirAccess.get_files_at(AUDIO_DIR):
		if file.get_extension() == "ogg":
			files.append(file.get_basename())
	return files


# ─── files ───

func test_every_sound_the_app_names_has_a_stream() -> void:
	for sound_id in Sounds.ALL:
		assert_has(GodotAudioBus.sound_ids(), sound_id)
		assert_true(ResourceLoader.exists(AUDIO_DIR + sound_id + ".ogg"), sound_id)


func test_every_ogg_is_a_sound_the_app_names() -> void:
	var files := _ogg_files()
	files.sort()
	var named := Sounds.ALL.duplicate()
	named.sort()
	assert_eq(files, named)


func test_every_file_is_a_one_shot_vorbis_stream() -> void:
	for sound_id in Sounds.ALL:
		var stream: Variant = load(AUDIO_DIR + sound_id + ".ogg")
		assert_true(stream is AudioStreamOggVorbis, sound_id)
		if stream is AudioStreamOggVorbis:
			assert_false(stream.loop, "%s must not loop (only the ambient bed loops)" % sound_id)


func test_no_sound_is_longer_than_the_design_allows() -> void:
	for sound_id in Sounds.ALL:
		var category := "world" if sound_id in WORLD_SOUNDS else "feedback"
		var seconds: float = load(AUDIO_DIR + sound_id + ".ogg").get_length()
		assert_gt(seconds, 0.0, sound_id)
		assert_lte(seconds, LIMIT_SECONDS[category], "%s is %.3f s" % [sound_id, seconds])


func test_the_manifest_matches_the_files() -> void:
	var listed: Array[String] = []
	for entry: Dictionary in _manifest_sounds():
		listed.append(entry.id)
		var seconds: float = load(AUDIO_DIR + entry.file).get_length()
		assert_almost_eq(seconds, float(entry.duration_s), 0.01, entry.id)
		assert_string_starts_with(entry.source, "packages/audio/src/recipes.ts")
	listed.sort()
	var named := Sounds.ALL.duplicate()
	named.sort()
	assert_eq(listed, named)


# ─── playback ───

func test_the_pool_plays_on_the_sfx_bus() -> void:
	assert_ne(AudioServer.get_bus_index(GodotAudioBus.BUS), -1, "default_bus_layout.tres declares SFX")
	var players := _host.get_children()
	assert_eq(players.size(), GodotAudioBus.VOICES)
	for player: AudioStreamPlayer in players:
		assert_eq(player.bus, GodotAudioBus.BUS)


func test_play_starts_a_voice_with_that_sound() -> void:
	_bus.play(Sounds.FLUENT)
	assert_true(_bus.is_playing())
	var sounding := _host.get_children().filter(func(p: AudioStreamPlayer) -> bool: return p.playing)
	assert_eq(sounding.size(), 1)
	assert_eq(sounding[0].stream, GodotAudioBus.STREAMS[Sounds.FLUENT])


func test_muting_stops_what_is_sounding() -> void:
	_bus.play(Sounds.FLUENT)
	_bus.play(Sounds.HATCH)
	_bus.set_muted(true)
	assert_true(_bus.is_muted())
	assert_false(_bus.is_playing())


func test_a_muted_bus_plays_nothing_until_unmuted() -> void:
	_bus.set_muted(true)
	_bus.play(Sounds.CORRECT)
	assert_false(_bus.is_playing())
	_bus.set_muted(false)
	_bus.play(Sounds.CORRECT)
	assert_true(_bus.is_playing())


func test_never_more_voices_than_the_pool() -> void:
	for i in GodotAudioBus.VOICES + 3:
		_bus.play(Sounds.TAP)
	var sounding := _host.get_children().filter(func(p: AudioStreamPlayer) -> bool: return p.playing)
	assert_eq(sounding.size(), GodotAudioBus.VOICES)


func test_an_unknown_id_is_silent_not_a_crash() -> void:
	_bus.play("buzzer")
	assert_false(_bus.is_playing())
