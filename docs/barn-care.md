# Barn care rules (SF-107)

The rules half of the barn: per-animal health and the four care tasks, as pure
GDScript in `game/domain/care/` with the use-cases on `FarmGame`. The barn
scene binds to the read-models below; it decides nothing. Every number here is
a constant in one place, so tuning one is a one-line change plus its test.

Prototype sources are in git history before the rebuild commit `db9c208`
(`git show db9c208^:src/contracts/care.ts`).

## The rules and where they come from

| Rule | Value | Where in code | Source |
| --- | --- | --- | --- |
| Starting animals | cow, pig, chick, at health 70 | `Barn.starting_animals` | PRD.md:75 ("~3 animals"); the three in `game/scenes/farm/farm.tscn` |
| Tasks | feed, water, clean, play | `CareTask.ALL` | redesign-notes.md:14, PRD.md:56 |
| Questions per task | feed 5, water 4, clean 4, play 3 | `CareTask.questions_for` | prototype `care.ts:31` (`CARE_QUESTIONS`) |
| Health restored | feed +16, water / clean / play +12 | `CareTask.health_bonus` | prototype `care.ts:46` (`CARE_HEALTH_BONUS`) |
| Health range | 15..100, starts at 70 | `AnimalHealth.FLOOR / MAX / START` | redesign-notes.md:23-24; prototype `care.ts:39-42` |
| Decay | −14 per day with no care at all; the day after care is free | `AnimalHealth.on_day` | redesign-notes.md:23-24; prototype `care.ts:44`, `gameState.tsx:119-121` |
| Decay cap | at most 5 days' worth (−70), however long away | `AnimalHealth.MAX_DECAY_DAYS` | prototype `gameState.tsx:119` (`Math.min(5, …)`) |
| Never cared for | no decay | `AnimalHealth.on_day` | prototype `gameState.tsx:118` (decays only from a last-care day) |
| Mood bands | happy ≥ 66, glum < 34, okay between; the floor (15) is glum | `AnimalHealth.band` | redesign-notes.md:25; prototype `care.ts:53-54` |
| Feed | feeding uses 3 feed; the others are free | `CareTask.feed_cost` (= `Coins.FEED_PER_FEEDING`) | redesign-notes.md:22; prototype `constants.ts:126` |
| No feed | feeding is refused with `Barn.NEED_FEED` ("visit-the-feed-shed"); other tasks still start | `Barn.check_care` | prototype `StallPanel.tsx:199` |
| Once a day | a task done today is refused until local midnight | `Barn.check_care`, `CareDay.of` | redesign-notes.md:17; prototype `StallPanel.tsx:199` |
| Earned by answers | care lands only when `end_round` closes a care round with every question graded; ended early, nothing happens and no feed is used | `FarmGame._with_care_applied` | PRD.md:42; CLAUDE.md rule 2 |
| Mixed facts | a care round is mixed practice in the `stall` context | `RoundPresets.care` | curriculum.md:117 |
| No coins | stall rounds mint none | `Coins.context_earns_coins` (unchanged) | CLAUDE.md rule 2; redesign-notes.md:20-21; curriculum.md:118 |
| Glum, never gone | health never below 15; animals are never removed | `AnimalHealth.FLOOR`, `Barn` | CLAUDE.md rule 6; PRD.md:34 |

Animals hatched from the nest join the barn under these same rules
(`nest.md`).

One deliberate change from the prototype: it wrote the decayed health back on
every load, so reloading on the same day decayed an animal twice. Here the save
keeps the health as of the last care day and decay is worked out when read, so
loading never changes an animal.

## What the scene binds to

- `FarmGame.barn() -> Result` → `BarnSummary`: `animals: Array[AnimalSummary]`,
  `feed`, `feed_per_feeding`, `needs_feed_shed`, `all_done_today`.
- `AnimalSummary`: `id`, `species`, `health` (15..100, today's), `band`
  (`happy` / `okay` / `glum` — posture and face, never colour), `tasks_due`.
- `FarmGame.start_care(animal_id, task) -> Result` → the first `Question`;
  refusals: `Barn.NEED_FEED`, `Barn.ALREADY_DONE_TODAY`, `Barn.UNKNOWN_ANIMAL`,
  `Barn.UNKNOWN_TASK`, or a round already active.
- Then the usual `answer()` per question (the reactive scene steps on each
  correct `AnswerFeedback`), and `end_round()` applies the care.
- `FarmGame.care_in_progress() -> CareOrder` (`animal_id`, `task`) or null.

## Save

Schema v4 adds `animals`: `[{id, species, health, done: {feed, water, clean,
play: day number or null}}]`. A v3 save loads with the starting animals and is
written back as v4 (`user://farm-save.v4.json`; the v3 file is read when no v4
one exists and is left in place). `FarmSaveCodec` rejects an unknown species,
health outside 15..100, a missing or extra task, a bad day, or a repeated id.
Days are whole days since 1970 at the player's local midnight (`Clock.utc_offset_minutes`).

## Open tuning questions

1. Should a round of all-wrong answers still earn the care? (Today: yes — any
   completed round counts, matching the prototype.)
2. Animals never cared for do not decay, so a new player's animals stay at 70
   (happy) until first cared for. Start decaying from the first visit instead?
3. Is 5 + 4 + 4 + 3 = 16 questions a day per animal (48 for three) right for a
   10-minute session? The prototype tuned it for one animal.
4. Should `start_round` stop requiring a family for `stall` rounds? Care rounds
   are mixed (curriculum.md) and use `start_care`; the family rule came from the
   TypeScript port.
