## The placeholder "next question" rule: uniform over the table, never the same
## fact twice in a row. SF-94 replaces this with the full scheduler port
## (Leitner boxes, latency, interleave, tiers).
class_name QuestionPicker
extends RefCounted


## Returns null only for an empty table.
static func pick(facts: Array[Fact], previous_id: String, rng: Rng) -> Fact:
	var candidates := facts.filter(func(fact: Fact) -> bool: return fact.id != previous_id)
	if candidates.is_empty():
		candidates = facts
	if candidates.is_empty():
		return null
	var index := mini(int(rng.next_float() * candidates.size()), candidates.size() - 1)
	return candidates[index]
