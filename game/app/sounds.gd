## Which sound an answer makes — `sounds.ts`, as data. There is no audio port
## in the Godot client yet: the feedback names the sounds and the scene plays
## pre-rendered samples for them (ADR-0006: no procedural audio on the web).
class_name Sounds
extends RefCounted

const CORRECT := "correct"
const FLUENT := "fluent"
const WRONG := "wrong"
const HATCH := "hatch"


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
