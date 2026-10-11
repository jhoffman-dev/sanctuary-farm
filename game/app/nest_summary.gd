## Read-model: the nest as its scene renders it — the eggs, the egg waiting
## for its hatch ceremony, and the animals that hatched so far.
class_name NestSummary
extends RefCounted

## In family order.
var eggs: Array[EggSummary] = []
## The egg whose ceremony should play now, or null. Null while a round is
## running, so a hatch never interrupts a question: it appears once end_round
## has closed the round, and stays until FarmGame.hatch confirms it.
var pending_hatch: EggSummary
## Ids of the barn animals that hatched from the nest, in barn order.
var hatched: Array[String] = []
## Every family in play has hatched: the nest is empty for good.
var all_hatched: bool


static func of(farm: Dictionary, round_running: bool) -> NestSummary:
	var summary := NestSummary.new()
	for egg in Nest.eggs(farm):
		summary.eggs.append(EggSummary.of(farm, egg))
	var waiting := Nest.next_to_hatch(farm)
	if waiting != null and not round_running:
		summary.pending_hatch = EggSummary.of(farm, waiting)
	summary.hatched = Nest.hatched_animal_ids(farm)
	summary.all_hatched = Nest.all_hatched(farm)
	return summary
