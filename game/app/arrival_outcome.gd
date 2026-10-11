## Read-model: what the keeper arriving at a place opened (SF-77).
## - PRACTICE: the paddock's practice round is open. `started` is false when a
##   round was already running, so the caller keeps the one on screen.
## - COMING_SOON: the place exists, its activity does not yet.
class_name ArrivalOutcome
extends RefCounted

const PRACTICE := "practice"
const COMING_SOON := "coming-soon"

var kind: String
var started: bool
## The place arrived at, for COMING_SOON.
var place: String


static func practice(round_started: bool) -> ArrivalOutcome:
	var outcome := ArrivalOutcome.new()
	outcome.kind = PRACTICE
	outcome.started = round_started
	return outcome


static func coming_soon(at_place: String) -> ArrivalOutcome:
	var outcome := ArrivalOutcome.new()
	outcome.kind = COMING_SOON
	outcome.place = at_place
	return outcome
