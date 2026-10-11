## Cards in play and when they fall due — `scheduler/cards.ts`.
class_name SchedulerCards
extends RefCounted


## Every in-range fact that has a learning state, in table order. Facts missing
## from the state are inert.
static func in_play(state: Dictionary) -> Array[Card]:
	var facts: Dictionary = state.facts
	var cards: Array[Card] = []
	for fact in FactTable.table_of(state.max_table):
		var status: Variant = facts.get(fact.id)
		if status != null:
			cards.append(Card.new(fact, status))
	return cards


static func in_family(state: Dictionary, family: Variant) -> Array[Card]:
	var cards: Array[Card] = []
	var wanted: Variant = FactTuning.whole_number(family)
	if wanted == null:
		return cards
	for card in in_play(state):
		if card.fact.family == wanted:
			cards.append(card)
	return cards


## Questions since the card fell due; negative while it is still waiting.
static func overdue_by(card: Card, global_counter: int) -> int:
	return global_counter - card.status.due_at


static func is_due(card: Card, global_counter: int) -> bool:
	return overdue_by(card, global_counter) >= 0
