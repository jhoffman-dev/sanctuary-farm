## Read-model: the play session as the scenes render it — whether the farm is
## winding down or saying goodnight, and what today's goodnight summary shows.
## The times are for a parent's view and for tests; the child's scene shows
## no countdown (accessibility.md §2).
class_name SessionSummary
extends RefCounted

var length_minutes: float = PlaySession.LENGTH_MSEC / 60_000.0
var minutes_used: float
var minutes_left: float
## True in the last minute before goodnight: settle the farm down, once.
var winding_down: bool
## True once the session's time is used: no new round, care or purchase starts.
var goodnight: bool
## Today's answers, from the round logs.
var answered_today: int
var correct_today: int
var fluent_today: int
## Fact ids answered correctly faster today than on any earlier day.
var faster_facts: Array[String] = []
## Animals that had at least one care task done today.
var animals_cared_for_today: int


static func of(farm: Dictionary, now: int, utc_offset_minutes: int) -> SessionSummary:
	var today := CareDay.of(now, utc_offset_minutes)
	var session: Variant = farm.play_session
	var summary := SessionSummary.new()
	summary.minutes_used = PlaySession.used_msec(session, now, today) / 60_000.0
	summary.minutes_left = PlaySession.left_msec(session, now, today) / 60_000.0
	summary.winding_down = PlaySession.is_winding_down(session, now, today)
	summary.goodnight = PlaySession.is_goodnight(session, now, today)
	var tally := DayTally.of(farm.sessions, today, utc_offset_minutes)
	summary.answered_today = tally.answered
	summary.correct_today = tally.correct
	summary.fluent_today = tally.fluent
	summary.faster_facts = tally.faster_facts
	for animal: Dictionary in farm.animals:
		if Barn.tasks_due(animal, today).size() < CareTask.ALL.size():
			summary.animals_cared_for_today += 1
	return summary
