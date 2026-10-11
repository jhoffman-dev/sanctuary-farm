## The session clock — CLAUDE.md game rule 4: sessions end on time; the game
## says goodnight and never begs. Plain data, like the rest of the save:
##   {"started_at": int, "last_played_at": int (epoch ms),
##    "played_msec": int, "day": int (a CareDay)}
## Play is measured on the clock from the session's first round: every step
## between two moments of play counts, so a reload changes nothing. Once
## LENGTH_MSEC is used no new round starts; a round already running always
## finishes (accessibility.md §2). A new session begins after REST_MSEC with
## no play, or on a later local day. See docs/session.md for the sources.
class_name PlaySession
extends RefCounted

## original-spec.md:200 and :306 — "sessions are five minutes long".
const LENGTH_MSEC := 5 * 60_000
## accessibility.md:45 — goodnight is announced once, calmly, at least 60 s ahead.
const WIND_DOWN_MSEC := 60_000
## The spec is silent on when the next session may start beyond "she can start
## a free session whenever she wants" (original-spec.md:427). The least
## restrictive rule that still ends a session: a rest this long. Tuning question.
const REST_MSEC := 30 * 60_000
## The refusal reason when play is asked for after goodnight. It is a gentle
## state the scene shows as goodnight, never an error to report.
const GOODNIGHT := "goodnight"


## A session that starts with play at `now`.
static func begin(now: int, today: int) -> Dictionary:
	return {"started_at": now, "last_played_at": now, "played_msec": 0, "day": today}


## The session after play at `now`: the step since the last play is added, or
## a fresh session begins when the player has rested or it is a later day.
## A clock that stepped backwards adds nothing and becomes the new reference,
## so it can neither hand back time already used nor make time run twice.
static func played(session: Variant, now: int, today: int) -> Dictionary:
	if starts_anew(session, now, today):
		return begin(now, today)
	var step := maxi(now - int(session.last_played_at), 0)
	return {
		"started_at": session.started_at,
		"last_played_at": now,
		"played_msec": int(session.played_msec) + step,
		"day": session.day,
	}


## True when play at `now` would begin a new session rather than continue
## this one. An earlier day (a clock set back) never starts one.
static func starts_anew(session: Variant, now: int, today: int) -> bool:
	if session == null:
		return true
	return today > int(session.day) or now - int(session.last_played_at) >= REST_MSEC


## Play time used if the player played at `now`, in ms.
static func used_msec(session: Variant, now: int, today: int) -> int:
	if session == null:
		return 0
	return played(session, now, today).played_msec


## Time left before goodnight, never below 0.
static func left_msec(session: Variant, now: int, today: int) -> int:
	return maxi(LENGTH_MSEC - used_msec(session, now, today), 0)


## True once the session's time is used: no new round may start.
static func is_goodnight(session: Variant, now: int, today: int) -> bool:
	return left_msec(session, now, today) == 0


## True in the last WIND_DOWN_MSEC before goodnight, so the farm can settle
## down calmly ahead of it — once, and never as a countdown.
static func is_winding_down(session: Variant, now: int, today: int) -> bool:
	var left := left_msec(session, now, today)
	return left > 0 and left <= WIND_DOWN_MSEC
