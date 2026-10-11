## Whether a state can serve a question at all — `scheduler/playable.ts`.
class_name Playable
extends RefCounted


## Whether the scheduler has a fact to serve from this state exactly as it
## stands — one already introduced, or one it may introduce now. When neither
## holds, NextFact has no candidate and refuses, so a restored save that fails
## this is not playable and the caller should start a fresh farm instead.
##
## Deliberately judged on the stored tiers, without running the unlock rule
## first: a save whose own unlocked tiers reach none of its own facts is one
## the game never wrote, whatever the scheduler would go on to unlock for it.
static func has_playable_fact(state: Dictionary) -> bool:
	var cards := SchedulerCards.in_play(state)
	for card in cards:
		if card.status.introduced:
			return true
	return Introduction.pick(state, cards) != null
