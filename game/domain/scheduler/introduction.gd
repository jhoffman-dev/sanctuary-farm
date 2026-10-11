## Bringing new facts into play — `scheduler/introduce.ts`.
class_name Introduction
extends RefCounted


## The next fact to introduce: lowest unlocked tier first, table order within
## it. The blocked family is never chosen — introducing it would break the
## interleave rule — so a tier whose remaining facts are all that family is
## passed over for a higher unlocked tier, and null means no other family can
## be introduced yet.
static func pick(state: Dictionary, cards: Array[Card]) -> Card:
	var blocked := Interleave.blocked_family(state)
	var unlocked: Array = state.unlocked_tiers
	var chosen: Card = null
	for card in cards:
		if card.status.introduced or card.fact.family == blocked or not unlocked.has(card.fact.tier):
			continue
		if chosen == null or card.fact.tier < chosen.fact.tier:
			chosen = card
	return chosen


## Mark a card introduced at box 1 and due right now.
static func introduce(state: Dictionary, card: Card) -> Dictionary:
	var changes := {"introduced": true, "box": 1, "due_at": state.global_counter}
	return SchedulerState.with_status(state, FactState.patched(card.status, changes))
