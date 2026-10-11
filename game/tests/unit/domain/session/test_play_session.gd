## The session clock (domain/session/): five minutes of play from the first
## round, a calm minute of winding down, goodnight with no time left, a fresh
## session after a rest or on a later local day — and a clock that steps
## backwards neither hands time back nor breaks anything (game rule 4).
extends GutTest

const DAY := 20_000
const MINUTE := 60_000
## 10:00 UTC on DAY.
const START := DAY * CareDay.MSEC_PER_DAY + 10 * 3_600_000


func _after(session: Dictionary, msec: int) -> Dictionary:
	return PlaySession.played(session, int(session.last_played_at) + msec, DAY)


# ─── the numbers ───

func test_the_numbers_come_from_the_spec() -> void:
	assert_eq(PlaySession.LENGTH_MSEC, 5 * MINUTE, "original-spec.md: five-minute sessions")
	assert_eq(PlaySession.WIND_DOWN_MSEC, MINUTE, "accessibility.md: announced >= 60 s ahead")
	assert_eq(PlaySession.REST_MSEC, 30 * MINUTE, "a tuning question; one constant")


# ─── starting and counting ───

func test_a_session_begins_with_nothing_used() -> void:
	assert_eq(PlaySession.begin(START, DAY), {"started_at": START, "last_played_at": START, "played_msec": 0, "day": DAY})


func test_no_session_yet_means_the_first_play_begins_one() -> void:
	assert_true(PlaySession.starts_anew(null, START, DAY))
	assert_eq(PlaySession.played(null, START, DAY), PlaySession.begin(START, DAY))
	assert_eq([PlaySession.used_msec(null, START, DAY), PlaySession.left_msec(null, START, DAY)], [0, PlaySession.LENGTH_MSEC])
	assert_false(PlaySession.is_goodnight(null, START, DAY))


func test_every_step_between_plays_counts_from_the_first_round() -> void:
	var session := PlaySession.begin(START, DAY)
	session = _after(session, 40_000)
	session = _after(session, 3 * MINUTE)
	assert_eq([session.started_at, session.played_msec, session.day], [START, 40_000 + 3 * MINUTE, DAY])


func test_time_keeps_counting_between_plays_when_read() -> void:
	var session := PlaySession.begin(START, DAY)
	assert_eq(PlaySession.used_msec(session, START + 2 * MINUTE, DAY), 2 * MINUTE)
	assert_eq(PlaySession.left_msec(session, START + 2 * MINUTE, DAY), 3 * MINUTE)


# ─── winding down and goodnight ───

func test_the_last_minute_winds_down_and_only_the_last_minute() -> void:
	var session := PlaySession.begin(START, DAY)
	assert_false(PlaySession.is_winding_down(session, START + 4 * MINUTE - 1, DAY))
	assert_true(PlaySession.is_winding_down(session, START + 4 * MINUTE, DAY))
	assert_true(PlaySession.is_winding_down(session, START + 5 * MINUTE - 1, DAY))
	assert_false(PlaySession.is_winding_down(session, START + 5 * MINUTE, DAY), "goodnight is not winding down")


func test_goodnight_comes_exactly_when_the_time_is_used() -> void:
	var session := PlaySession.begin(START, DAY)
	assert_false(PlaySession.is_goodnight(session, START + 5 * MINUTE - 1, DAY))
	assert_true(PlaySession.is_goodnight(session, START + 5 * MINUTE, DAY))
	assert_eq(PlaySession.left_msec(session, START + 9 * MINUTE, DAY), 0, "never below zero")


# ─── the next session ───

func test_a_rest_of_half_an_hour_without_play_begins_a_new_session() -> void:
	var tired := _after(PlaySession.begin(START, DAY), 6 * MINUTE)
	var resting_at: int = tired.last_played_at + PlaySession.REST_MSEC - 1
	assert_true(PlaySession.is_goodnight(tired, resting_at, DAY))
	assert_false(PlaySession.starts_anew(tired, resting_at, DAY))
	var rested_at: int = tired.last_played_at + PlaySession.REST_MSEC
	assert_true(PlaySession.starts_anew(tired, rested_at, DAY))
	assert_false(PlaySession.is_goodnight(tired, rested_at, DAY))
	assert_eq(PlaySession.played(tired, rested_at, DAY), PlaySession.begin(rested_at, DAY))


func test_a_later_local_day_begins_a_new_session_even_without_a_rest() -> void:
	var tired := _after(PlaySession.begin(START, DAY), 6 * MINUTE)
	var next_morning: int = tired.last_played_at + 1
	assert_true(PlaySession.starts_anew(tired, next_morning, DAY + 1))
	assert_eq(PlaySession.left_msec(tired, next_morning, DAY + 1), PlaySession.LENGTH_MSEC)


# ─── a clock that steps backwards ───

func test_a_clock_set_back_hands_no_time_back() -> void:
	var session := _after(PlaySession.begin(START, DAY), 4 * MINUTE)
	var set_back := PlaySession.played(session, START - 10 * MINUTE, DAY)
	assert_eq(set_back.played_msec, 4 * MINUTE, "time already used stays used")
	assert_eq(set_back.last_played_at, START - 10 * MINUTE, "the new reading is the reference from now on")
	assert_eq(PlaySession.played(set_back, START - 9 * MINUTE, DAY).played_msec, 5 * MINUTE, "and real time keeps counting")


func test_a_clock_set_back_to_yesterday_does_not_begin_a_new_session() -> void:
	var tired := _after(PlaySession.begin(START, DAY), 6 * MINUTE)
	var yesterday := START - CareDay.MSEC_PER_DAY
	assert_false(PlaySession.starts_anew(tired, yesterday, DAY - 1))
	assert_true(PlaySession.is_goodnight(tired, yesterday, DAY - 1))
