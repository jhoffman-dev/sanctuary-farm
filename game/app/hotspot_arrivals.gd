## What the keeper arriving at a place opens (SF-77) — `hotspot-arrival.ts`.
## The place is a hotspot id as plain text, so an unknown place is simply one
## with nothing to do yet.
class_name HotspotArrivals
extends RefCounted

## The one place with an activity so far; the barn, nest and the rest follow.
const PRACTICE_PLACE := "paddock"

var _game: FarmGame


func _init(game: FarmGame) -> void:
	_game = game


## The keeper has stopped at `place`; the value is an ArrivalOutcome. At the
## paddock it waits for any save still landing (a mute toggle, the last
## answer) and then starts the paddock round when none is running. Refused
## with what FarmGame.start_round refuses otherwise (the farm not loaded).
func arrive_at(place: String) -> Result:
	if place != PRACTICE_PLACE:
		return Result.success(ArrivalOutcome.coming_soon(place))
	await _game.when_saved()
	# Checked after the wait: another arrival may have opened a round meanwhile.
	# An active round reports its planned total; an idle game reports 0 of 0.
	if _game.round_progress().total > 0:
		return Result.success(ArrivalOutcome.practice(false))
	var started := _game.start_round(RoundPresets.paddock())
	if not started.ok:
		return started
	return Result.success(ArrivalOutcome.practice(true))
