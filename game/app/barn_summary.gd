## Read-model: the barn as its scene renders it — each animal's health, mood
## band and due tasks, and whether there is feed for a feeding. Animals
## visiting the petting zoo are in ZooSummary instead, but their care still
## counts towards all_done_today.
class_name BarnSummary
extends RefCounted

## The animals living in the barn, in farm order.
var animals: Array[AnimalSummary] = []
var feed: int
## Feed one feeding uses.
var feed_per_feeding: int = CareTask.feed_cost(CareTask.FEED)
## True when a feeding cannot start: the barn suggests the feed shed.
var needs_feed_shed: bool
## True once every animal, in the barn or the zoo, has had every task today.
var all_done_today: bool


static func of(farm: Dictionary, today: int) -> BarnSummary:
	var summary := BarnSummary.new()
	summary.feed = farm.feed
	summary.needs_feed_shed = farm.feed < summary.feed_per_feeding
	for animal: Dictionary in Zoo.in_barn(farm):
		summary.animals.append(AnimalSummary.of(animal, today))
	summary.all_done_today = farm.animals.all(func(animal: Dictionary) -> bool: return Barn.tasks_due(animal, today).is_empty())
	return summary
