## Which sound an answer makes — `sounds.ts`, as data. The feedback names the
## sounds; FarmAudio plays them through the AudioBus port, whose Godot adapter
## plays pre-rendered OGGs of the synth recipes (ADR-0006: no procedural audio
## on the web; game/tools/render_sounds.mjs makes the files).
class_name Sounds
extends RefCounted

const CORRECT := "correct"
const FLUENT := "fluent"
const WRONG := "wrong"
const HATCH := "hatch"
## Rendered, not yet wired (docs/sound-design.md §3).
const TAP := "tap"
const FOOTSTEP := "footstep"
const DOOR_OPEN := "door_open"
const CHEW := "chew"

## Every sound id an AudioBus must be able to play.
const ALL: Array[String] = [CORRECT, FLUENT, WRONG, HATCH, TAP, FOOTSTEP, DOOR_OPEN, CHEW]


static func for_outcome(outcome: String) -> String:
	match outcome:
		Outcome.FLUENT:
			return FLUENT
		Outcome.WRONG:
			return WRONG
		_:
			return CORRECT


## The outcome's sound, then the hatch fanfare when the answer finished a family.
static func for_graded(outcome: String, family_just_mastered: int) -> Array[String]:
	var sounds: Array[String] = [for_outcome(outcome)]
	if family_just_mastered != FactTuning.NO_FAMILY:
		sounds.append(HATCH)
	return sounds
