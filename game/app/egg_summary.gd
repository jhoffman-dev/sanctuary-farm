## Read-model: one egg as the nest scene renders it.
class_name EggSummary
extends RefCounted

## Pass to FarmGame.start_egg / hatch.
var id: String
var family: int
## The Species that hatches from it.
var species: String
## 0..1: the family's progress. It can look "almost" but reaches 1.0 only
## when the family is mastered (dull → glowing → cracked is the scene's call).
var progress: float
## The family is mastered: practice is over and the egg waits to hatch.
var ready_to_hatch: bool


static func of(farm: Dictionary, egg: Egg) -> EggSummary:
	var summary := EggSummary.new()
	summary.id = egg.id
	summary.family = egg.family
	summary.species = egg.species
	summary.progress = Nest.progress(farm, egg)
	summary.ready_to_hatch = Nest.is_ready_to_hatch(farm, egg)
	return summary
