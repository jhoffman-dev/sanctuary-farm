# Sessions end on time (SF-111)

The rules half of game rule 4 — *sessions end on time; the game says
goodnight; it never begs* (`CLAUDE.md`, `PRD.md:33`). Pure GDScript in
`game/domain/session/` with the use-cases on `FarmGame`. The goodnight scene
binds to the read-model below and decides nothing. Every number is one
constant.

## The rules and where they come from

| Rule | Value | Where in code | Source |
| --- | --- | --- | --- |
| Session length | 5 minutes of clock time from the session's first round | `PlaySession.LENGTH_MSEC` | `original-spec.md:200` ("sessions are five minutes long"), `:306` ("a five-minute session") |
| What counts | every step between two moments of play (starting a round, an answer, closing a round); walking about before the first round does not | `PlaySession.played` | ticket: "measured with the injected Clock from session start" |
| Winding down | the last 60 s; the scene settles the farm once — no countdown, no ticking | `PlaySession.WIND_DOWN_MSEC`, `is_winding_down` | `accessibility.md:45` ("announced once, calmly, ≥ 60 s ahead; no countdown") |
| A running round finishes | answers and `end_round` are never refused for time | `FarmGame._grade` / `_end_round` have no session check | `accessibility.md:45` ("the current question is always allowed to finish") |
| Goodnight | no new round, no care, no feed purchase; refused with `PlaySession.GOODNIGHT` — a state, not an error | `FarmGame._ready_to_start`, `_buy_feed` | `original-spec.md:427` ("says goodnight rather than offering another round") |
| Shop after goodnight | **shut** — the farm settles down; buying feed only matters next session anyway | `FarmGame._buy_feed` | decision (see tuning questions) |
| Next session | after **30 minutes** with no play, or on a later local day, whichever comes first | `PlaySession.REST_MSEC`, `starts_anew` | spec is silent beyond "she can start a free session whenever she wants, but the game never asks" (`original-spec.md:427`); least restrictive rule that still ends a session |
| Refusals don't count | asking to play after goodnight is not play, so it never pushes the next session back | `FarmGame._played_now` only on play | — |
| Clock set back | adds nothing and becomes the new reference: time used stays used, real time keeps counting; a day earlier never starts a session | `PlaySession.played`, `starts_anew` | `Clock.now_msec` contract ("it may step backwards") |
| Goodnight summary | today's answered / correct / fluent (prototype `SummaryScreen.tsx`), facts answered correctly faster today than on any earlier day, animals cared for today | `DayTally`, `SessionSummary` | prototype `git show db9c208^:src/game/screens/SummaryScreen.tsx`; ticket |

No streaks, no "come back or…" copy, no countdown: nothing in the rules
threatens or counts down (rule 6, `accessibility.md:45`).

## What the scene binds to

- `FarmGame.session() -> Result` → `SessionSummary`: `length_minutes`,
  `minutes_used`, `minutes_left`, `winding_down`, `goodnight`,
  `answered_today`, `correct_today`, `fluent_today`, `faster_facts`
  (fact ids), `animals_cared_for_today`. The times are for a parent view and
  tests; the child's scene shows no clock.
- The goodnight hook: `start_round`, `start_care` and `buy_feed` return
  `Result.failure(PlaySession.GOODNIGHT)` once the time is used. The scene
  shows goodnight on that reason, or when `session().goodnight` turns true
  after `end_round`. It polls `session()` to catch `winding_down` once.

## Reload-proof

The save (v4, unreleased with #172) gains `play_session`:
`{started_at, last_played_at, played_msec, day}` or null. Starting a round
records play in memory; every answer and `end_round` persists it, so a reload
reads it back and the time between the last play and the reload still counts.
A missing or malformed `play_session` loads as null (a fresh session) rather
than discarding the farm: the worst case is one extra session, and only for a
hand-edited save.

## Open tuning questions for James

1. **Five minutes** is the original spec's number, but barn care alone is
   16 questions per animal (48 for three, `barn-care.md` Q3, which assumed a
   10-minute session without a source). Five minutes, ten, or "until the
   chores are done" as the prototype did?
2. **Rest of 30 minutes** before a new session (or the next day). Shorter,
   longer, or next day only?
3. **The feed shed is shut** after goodnight. Open it instead? (A purchase is
   not a round, but it keeps her in the game.)
4. Should **finishing every chore** (`BarnSummary.all_done_today`) also say
   goodnight, as the prototype did, even with time left?
5. A parent-set length (a setting) instead of a constant?
