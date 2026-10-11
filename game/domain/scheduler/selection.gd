## Choosing among candidates — `scheduler/select.ts`. Each picker takes a
## non-empty list and keeps the earliest of equals, so table order is the final
## tiebreak (TypeScript reaches the same choice with a reduce or a stable sort).
class_name Selection
extends RefCounted


static func most_overdue(cards: Array[Card], global_counter: int) -> Card:
	var best := cards[0]
	for card in cards:
		if SchedulerCards.overdue_by(card, global_counter) > SchedulerCards.overdue_by(best, global_counter):
			best = card
	return best


static func selection_weight(card: Card, global_counter: int) -> int:
	var overdue := maxi(0, SchedulerCards.overdue_by(card, global_counter))
	var weight := overdue * FactTuning.WEIGHT_OVERDUE_MULTIPLIER
	if card.fact.hard_core:
		weight += FactTuning.WEIGHT_HARD_CORE_BONUS
	if card.status.box <= FactTuning.WEIGHT_LOW_BOX_MAX:
		weight += FactTuning.WEIGHT_LOW_BOX_BONUS
	return weight


static func worst_rolling_mean(cards: Array[Card]) -> Card:
	var worst := cards[0]
	for card in cards:
		if _mean_latency(card) > _mean_latency(worst):
			worst = card
	return worst


## The card that comes first by need: lower box, then most overdue, then the
## slowest rolling latency — `byNeed`, as the head of a stable sort.
static func neediest(cards: Array[Card], global_counter: int) -> Card:
	var best := cards[0]
	for card in cards:
		if compare_need(card, best, global_counter) < 0:
			best = card
	return best


## Negative when `first` is needier than `second`, positive when less, 0 when equal.
static func compare_need(first: Card, second: Card, global_counter: int) -> int:
	if first.status.box != second.status.box:
		return first.status.box - second.status.box
	var overdue_gap := (
		SchedulerCards.overdue_by(second, global_counter) - SchedulerCards.overdue_by(first, global_counter)
	)
	if overdue_gap != 0:
		return overdue_gap
	var first_mean := _mean_latency(first)
	var second_mean := _mean_latency(second)
	if first_mean == second_mean:
		return 0
	return 1 if second_mean > first_mean else -1


static func _mean_latency(card: Card) -> float:
	return Latency.rolling_mean(card.status.recent_latencies)
