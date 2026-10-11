## Latency drives mastery (game rule 3) — `scheduler/latency.ts`.
class_name Latency
extends RefCounted


## A latency is a measured duration, so only a finite number >= 0 is meaningful.
## NaN would grade LABORED (every comparison is false) and demote a correct
## answer; the application substitutes a slow-but-valid latency for a clock
## that ran backwards before it gets here, so a stepped clock never grades FLUENT.
static func check(latency_ms: float) -> Result:
	if not is_finite(latency_ms) or latency_ms < 0.0:
		return Result.failure(
			"latency must be a finite, non-negative number of ms, got %s" % str(latency_ms)
		)
	return Result.success(latency_ms)


static func classify_outcome(correct: bool, latency_ms: float) -> String:
	if not correct:
		return Outcome.WRONG
	if latency_ms < FactTuning.FLUENT_MAX_MS:
		return Outcome.FLUENT
	if latency_ms <= FactTuning.LABORED_MIN_MS:
		return Outcome.SLOW
	return Outcome.LABORED


## A fact with no history counts as infinitely slow, so it is drilled first.
static func rolling_mean(latencies: Array) -> float:
	if latencies.is_empty():
		return INF
	var sum := 0.0
	for ms: Variant in latencies:
		sum += float(ms)
	return sum / latencies.size()
