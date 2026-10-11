## Read-model: the farm as the scenes render it — plain numbers, no scheduler
## internals.
class_name FarmSummary
extends RefCounted

var coins: int
var feed: int
var muted: bool
## One per family in play, in family order:
## {"family": int, "progress": float in [0, 1], "mastered": bool}.
var families: Array[Dictionary] = []


static func of(farm: Dictionary) -> FarmSummary:
	var summary := FarmSummary.new()
	summary.coins = farm.coins
	summary.feed = farm.feed
	summary.muted = farm.settings.muted
	var scheduler: Dictionary = farm.scheduler
	for family in FactTuning.ALL_FAMILIES:
		if family <= scheduler.max_table:
			summary.families.append({
				"family": family,
				"progress": Mastery.family_progress(scheduler, family),
				"mastered": Mastery.is_family_mastered(scheduler, family),
			})
	return summary

