## Read-model: the barn as its scene renders it — each animal's health, mood
## band and due tasks, and whether there is feed for a feeding.
class_name BarnSummary
extends RefCounted

var animals: Array[AnimalSummary] = []
var feed: int
## Feed one feeding uses.
var feed_per_feeding: int = CareTask.feed_cost(CareTask.FEED)
## True when a feeding cannot start: the barn suggests the feed shed.
var needs_feed_shed: bool
## True once every animal has had every task today.
var all_done_today: bool


static func of(farm: Dictionary, today: int) -> BarnSummary:
	var summary := BarnSummary.new()
	summary.feed = farm.feed
	summary.needs_feed_shed = farm.feed < summary.feed_per_feeding
	for animal: Dictionary in farm.animals:
		summary.animals.append(AnimalSummary.of(animal, today))
	summary.all_done_today = summary.animals.all(func(a: AnimalSummary) -> bool: return a.tasks_due.is_empty())
	return summary
