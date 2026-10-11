## The goodnight summary's tally (domain/session/day_tally.gd): today's
## answered / correct / fluent from the round logs, at the player's local
## midnight, and the facts answered correctly faster today than ever before.
extends GutTest

const DAY := 20_000
const HOUR := 3_600_000
const NOON := DAY * CareDay.MSEC_PER_DAY + 12 * HOUR


## An entry tagged with when its round started; _logs groups them into rounds.
## asked_at is the scheduler's counter, deliberately unrelated to the day.
func _entry(fact_id: String, latency_ms: float, at: int, correct: bool = true) -> Dictionary:
	var outcome := Outcome.WRONG
	if correct:
		outcome = Outcome.FLUENT if latency_ms <= FactTuning.FLUENT_MAX_MS else Outcome.SLOW
	return {
		"round_at": at,
		"entry": {"fact_id": fact_id, "given": 0, "correct": correct, "latency_ms": latency_ms, "outcome": outcome, "asked_at": 7},
	}


## One round log per entry, started at the entry's round_at.
func _logs(tagged: Array) -> Array:
	return tagged.map(func(item: Dictionary) -> Dictionary:
		return {"started_at": item.round_at, "ended_at": item.round_at, "context": SessionContext.PADDOCK, "family": null, "entries": [item.entry]})


func test_no_play_tallies_nothing() -> void:
	var tally := DayTally.of([], DAY, 0)
	assert_eq([tally.answered, tally.correct, tally.fluent, tally.faster_facts], [0, 0, 0, [] as Array[String]])


func test_counts_only_todays_answers() -> void:
	var logs := _logs([
		_entry("3x4", 1000, NOON - CareDay.MSEC_PER_DAY),
		_entry("3x4", 1000, NOON),
		_entry("6x7", 5000, NOON),
		_entry("6x8", 1000, NOON, false),
		_entry("2x2", 1000, NOON + CareDay.MSEC_PER_DAY),
	])
	var tally := DayTally.of(logs, DAY, 0)
	assert_eq([tally.answered, tally.correct, tally.fluent], [3, 2, 1])


func test_a_round_counts_on_the_day_it_started() -> void:
	var round_log := {"started_at": NOON, "ended_at": NOON, "context": SessionContext.PADDOCK, "family": null,
		"entries": [_entry("3x4", 1000, 0).entry, _entry("6x7", 1000, 0).entry]}
	assert_eq(DayTally.of([round_log], DAY, 0).answered, 2)
	assert_eq(DayTally.of([round_log], DAY + 1, 0).answered, 0)


func test_today_turns_over_at_the_players_midnight() -> void:
	var late_evening_utc := DAY * CareDay.MSEC_PER_DAY + 23 * HOUR
	var logs := _logs([_entry("3x4", 1000, late_evening_utc)])
	assert_eq(DayTally.of(logs, DAY, 0).answered, 1)
	assert_eq(DayTally.of(logs, DAY + 1, 120).answered, 1, "already tomorrow two hours east of UTC")
	assert_eq(DayTally.of(logs, DAY, 120).answered, 0)


func test_a_fact_got_faster_when_today_beats_every_earlier_day() -> void:
	var yesterday := NOON - CareDay.MSEC_PER_DAY
	var logs := _logs([
		_entry("3x4", 4000, yesterday),
		_entry("3x4", 2500, yesterday),
		_entry("6x7", 2000, yesterday),
		_entry("6x8", 9000, yesterday, false),
		_entry("3x4", 2000, NOON),
		_entry("6x7", 2600, NOON),
		_entry("6x8", 1000, NOON),
		_entry("9x9", 1000, NOON),
	])
	assert_eq(DayTally.of(logs, DAY, 0).faster_facts, ["3x4"] as Array[String], "6x7 slower; 6x8 never right before; 9x9 is new")


func test_a_wrong_answer_says_nothing_about_speed() -> void:
	var logs := _logs([_entry("3x4", 3000, NOON - CareDay.MSEC_PER_DAY), _entry("3x4", 100, NOON, false)])
	var tally := DayTally.of(logs, DAY, 0)
	assert_eq(tally.faster_facts, [] as Array[String])
	assert_eq([tally.answered, tally.correct], [1, 0])


func test_an_entry_it_cannot_read_is_left_out_not_trusted() -> void:
	var good: Dictionary = _entry("3x4", 1000, NOON).entry
	var entries: Array = [
		"not an entry", {}, FarmSave.with_changes(good, {"latency_ms": "fast"}),
		FarmSave.with_changes(good, {"latency_ms": NAN}), FarmSave.with_changes(good, {"correct": 1}),
		FarmSave.with_changes(good, {"fact_id": 34}), FarmSave.with_changes(good, {"outcome": 7}), good,
	]
	var round_log := {"started_at": NOON, "ended_at": NOON, "context": SessionContext.PADDOCK, "family": null, "entries": entries}
	var tally := DayTally.of([round_log], DAY, 0)
	assert_eq([tally.answered, tally.correct, tally.fluent], [2, 2, 1], "a strange outcome is still a readable answer, just not a fluent one")
