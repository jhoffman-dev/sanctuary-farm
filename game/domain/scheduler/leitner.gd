## The Leitner boxes — `scheduler/leitner.ts`.
class_name Leitner
extends RefCounted


## Box 0 (not yet introduced) re-queues like box 1.
static func interval_for(box: int) -> int:
	return FactTuning.LEITNER_INTERVALS[1 if box == 0 else box]


static func clamp_box(box: int) -> int:
	return clampi(box, 0, FactTuning.MASTERY_BOX)


## FLUENT promotes, LABORED demotes (floor 1), WRONG resets to 1, SLOW holds.
static func box_after(outcome: String, previous: int) -> int:
	match outcome:
		Outcome.FLUENT:
			return clamp_box(previous + 1)
		Outcome.LABORED:
			return clamp_box(maxi(1, previous - 1))
		Outcome.WRONG:
			return 1
		_:
			return previous


## SLOW keeps its box but comes back at box 1's interval — the shortest — so a
## hesitant fact is seen again soon. Every other outcome re-queues at the new
## box's interval.
static func requeue_interval(outcome: String, next_box: int) -> int:
	return interval_for(1 if outcome == Outcome.SLOW else next_box)
