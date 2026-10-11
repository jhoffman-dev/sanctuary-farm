## What the keeper arriving at a place opens (SF-77) — `hotspot-arrival.ts`.
## The place is a hotspot id as plain text, so an unknown place is simply one
## with nothing to do yet.
class_name HotspotArrivals
extends RefCounted

## The one place with an activity so far; the barn, nest and the rest follow.
const PRACTICE_PLACE := "paddock"

var _game: FarmGame
## Counts the keeper's stops and set-offs. An arrival remembers the count it
## was made at; if the count has moved on by the time its save lands, the
## keeper is no longer standing where she arrived (SF-98, Codex on #130).
var _latest_stop := 0


func _init(game: FarmGame) -> void:
	_game = game


## The keeper has stopped at `place`; the value is an ArrivalOutcome. At the
## paddock it waits for any save still landing (a mute toggle, the last
## answer) and then starts the paddock round when none is running — unless she
## stopped somewhere newer or set off again meanwhile (MOVED_ON, nothing opens).
## Refused with what FarmGame.start_round refuses otherwise (the farm not loaded).
func arrive_at(place: String) -> Result:
	_latest_stop += 1
	var stop := _latest_stop
	if place != PRACTICE_PLACE:
		return Result.success(ArrivalOutcome.coming_soon(place))
	await _game.when_saved()
	if stop != _latest_stop:
		return Result.success(ArrivalOutcome.moved_on(place))
	# Checked after the wait: another arrival may have opened a round meanwhile.
	# An active round reports its planned total; an idle game reports 0 of 0.
	if _game.round_progress().total > 0:
		return Result.success(ArrivalOutcome.practice(false))
	var started := _game.start_round(RoundPresets.paddock())
	if not started.ok:
		return started
	return Result.success(ArrivalOutcome.practice(true))


## The keeper has set off from wherever she last stopped. An arrival still
## waiting for a save is dropped: she is no longer there to practise.
func keeper_moved() -> void:
	_latest_stop += 1
