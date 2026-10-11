## Introduction tiers open in order — `scheduler/tiers.ts`.
class_name TierUnlock
extends RefCounted

const _HIGHEST_TIER := 6
const _UNLOCK_BOX := 3


## Unlock every tier whose predecessor has reached the box-3 share. Returns the
## same state when nothing changed.
static func with_unlocked_tiers(state: Dictionary, cards: Array[Card]) -> Dictionary:
	var unlocked: Array = state.unlocked_tiers
	if unlocked.is_empty():
		return state
	var highest: int = unlocked.max()
	var opened := unlocked
	while highest < _HIGHEST_TIER and _tier_is_cleared(cards, highest):
		highest += 1
		opened = opened.duplicate()
		opened.append(highest)
	if is_same(opened, unlocked):
		return state
	return SchedulerState.with_changes(state, {"unlocked_tiers": opened})


## Whether a tier has been taken far enough to open the next one. A tier with
## no cards in play — every "has a 9" fact on an 8×8 table, say — is vacuously
## cleared: it can never reach box 3, and treating it as unmet would wall off
## every tier above it for good.
static func _tier_is_cleared(cards: Array[Card], tier: int) -> bool:
	var in_tier := 0
	var at_unlock_box := 0
	for card in cards:
		if card.fact.tier == tier:
			in_tier += 1
			if card.status.box >= _UNLOCK_BOX:
				at_unlock_box += 1
	if in_tier == 0:
		return true
	return float(at_unlock_box) / in_tier >= FactTuning.TIER_UNLOCK_BOX3_SHARE
