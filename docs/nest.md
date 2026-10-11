# Nest rules (SF-106)

The rules half of the nest: eggs, egg practice and hatching, as pure GDScript
in `game/domain/nest/` with the use-cases on `FarmGame`. The nest scene and the
hatch ceremony (including the reduced-motion version) bind to the read-model
below; they decide nothing. Every number here is a constant in one place.

Prototype sources are in git history before the rebuild commit `db9c208`
(`git show db9c208^:src/game/screens/NestScreen.tsx`).

## The rules and where they come from

| Rule | Value | Where in code | Source |
| --- | --- | --- | --- |
| One egg per family | families 1–12 (up to the table size), each hatching into its own animal | `Nest.FAMILY_SPECIES` | curriculum.md:113 ("one animal / one egg per family — 12 in all") |
| Which animal | 1 chick, 2 duck, 3 rabbit, 4 sheep, 5 pig, 6 cat, 7 dog, 8 horse, 9 goat, 10 cow, 11 goose, 12 donkey | `Nest.FAMILY_SPECIES`, `Species.ALL` | prototype `creatures/definitions.ts:9-20` |
| No egg for a barn animal | a family whose animal already lives in the barn has no egg — so the day-one cow, pig and chick (families 10, 5, 1) never do | `Nest.eggs` | prototype `NestScreen.tsx:23-24` (`COLD_START_CREATURE_FAMILY`, "a gift, no egg ceremony", `constants.ts:136`), generalised to the rebuild's three starting animals (`barn-care.md`) |
| When an egg appears | once any fact of its family has been introduced; so a fresh farm shows only the 2s egg (duck), and more appear as practice reaches their tiers | `Nest.eggs` | prototype `NestScreen.tsx:20-24` (`introducedFamilies`) |
| How many at once | every egg that qualifies, in family order; the scene lays them out | `Nest.eggs` | prototype `NestScreen.tsx:88` (renders all) |
| Egg progress | the family's progress: share of its facts at box ≥ 3, capped at 0.98 until every fact is mastered | `Nest.progress` → `Mastery.family_progress` | curriculum.md:114 |
| Only graded answers | progress is computed from the scheduler, which only grading moves; starting or ending a round moves nothing | `Nest.progress` | CLAUDE.md rule 2 |
| Latency matters | fluent promotes a fact's box, slow-correct holds it, labored or wrong drops it — so slow answers never grow an egg and never hatch one | `Grading`, `Leitner` (unchanged) | CLAUDE.md rule 3; curriculum.md §3 |
| Grows from all practice | mixed practice (care, paddock) grows eggs too; egg practice only aims it | `Nest.progress` | redesign-notes.md:48 ("passive fill from all practice, plus tap an egg") |
| Egg round | 5 questions of the family, in the `egg` context | `RoundPresets.egg`, `EGG_QUESTIONS` | prototype `constants.ts:113` (`EGG_PRACTICE_QUESTIONS`) |
| Egg practice picks | ~4 unmastered facts in rotation, never the same fact twice running | `NextFact.pick_in_family` (unchanged) | curriculum.md:116 |
| Interleave | egg practice ignores the family-3×-in-a-row rule on purpose; the round still records its families, so the next mixed question is from another family | `Interleave.serve` (unchanged) | curriculum.md:116; CLAUDE.md rule 5 |
| Coins | fluent 2, slow / labored 1, wrong 0 — the nest is one of the two places that pay | `Coins.context_earns_coins` (unchanged) | CLAUDE.md rule 2; curriculum.md:118 |
| Ready to hatch | the family is mastered: every fact at box 5 with its last 3 answers fluent (< 3 s) | `Nest.is_ready_to_hatch` → `Mastery.is_family_mastered` | curriculum.md:115 |
| A ready egg is not practised | `start_egg` refuses it with `Nest.READY_TO_HATCH`: it waits for its ceremony | `Nest.check_practice` | decision |
| Hatch waits for the round | a family mastered mid-round shows `ready_to_hatch` on its egg, but `pending_hatch` stays null until `end_round` closes the round | `NestSummary.of` | fixes redesign-notes.md:66 (the prototype's ceremony pre-empted the quiz and lost the round's log) |
| The scene picks the moment | the egg stays pending — across reloads — until `hatch(egg_id)` confirms it | `FarmGame.hatch` | ticket |
| Lowest family first | when two eggs are ready, `pending_hatch` is the lower family; the next shows after the first is hatched | `Nest.next_to_hatch` | decision |
| What hatches | exactly one new animal of the egg's species (id = species), at health 70 with every task due; from then on the barn's care rules apply to it | `Nest.hatch`, `Barn.new_animal` | prototype `gameState.tsx:316-331` (`claimHatch` adds a creature and an empty care record) |
| No coins for hatching | hatching mints nothing | `FarmGame._hatch` | CLAUDE.md rule 2 |
| After goodnight | `start_egg` is refused with `PlaySession.GOODNIGHT`; `hatch` is allowed — the egg was earned by answers already given | `FarmGame._ready_to_start`, `FarmGame._hatch` | session.md; decision |
| After the last egg | the nest is empty for good (`all_hatched`); practice carries on in the barn and paddock | `Nest.all_hatched` | decision |

## What the scene binds to

- `FarmGame.nest() -> Result` → `NestSummary`:
  - `eggs: Array[EggSummary]` — `id` (`"egg-<family>"`), `family`, `species`,
    `progress` (0..1), `ready_to_hatch`.
  - `pending_hatch: EggSummary` or null — play the ceremony for this egg now.
  - `hatched: Array[String]` — ids of barn animals that came from the nest.
  - `all_hatched: bool` — every family in play has hatched.
- `FarmGame.start_egg(egg_id) -> Result` → the first `Question`; refusals:
  `Nest.UNKNOWN_EGG`, `Nest.READY_TO_HATCH`, `PlaySession.GOODNIGHT`, a round
  already active, a save in progress. Then the usual `answer()` per question
  (`AnswerFeedback.coins_earned`, `family_just_mastered`) and `end_round()`.
- The hatch hand-off: after `end_round`, read `nest().pending_hatch`; play the
  ceremony; then `await FarmGame.hatch(egg_id)` → the new `AnimalSummary`.
  Refusals: `Nest.NOT_READY`, `Nest.UNKNOWN_EGG`, a round active, the save
  failing (the egg stays pending).
- The egg's look (dull → glowing → cracked) is the scene's call from
  `progress`; the prototype used 0.34 and 0.67 (`constants.ts:139-140`).

## Save

No new field and no schema bump: the nest is derived. Progress and readiness
come from the scheduler; an egg is gone once its animal is in `animals`. So a
v4 save from before the nest loads unchanged, and a hatched egg stays hatched
after a reload. `Species` grows from 3 kinds to 12 (the codec accepts each),
and `AnimalsCodec` now also rejects two animals of one species — each family
hatches once.

## Open tuning questions for James

1. **No egg for the cow, pig and chick.** Their families (10, 5, 1) start
   with their animal, so they never hatch. curriculum.md:113 says the
   day-one animals are families 1, 2, **10**; the barn has cow, pig, chick
   (10, **5**, 1). Keep the barn's three, or make the duck (2) a day-one
   animal instead of the pig?
2. **Eggs appear on introduction**, which can be early (the 2s egg is there on
   day one) and, through egg practice, ahead of their tier
   (curriculum.md:163). Show only eggs whose tier has unlocked?
3. **The 1s.** Family 1 is one fact; with the chick in the barn it has no
   egg. If the chick hatches instead, it hatches after one fact's mastery.
4. **A ready egg can un-ready.** Readiness is live: if she answers a fact of a
   ready family wrong before the ceremony, the egg is no longer ready. Lock an
   egg's readiness at the moment of mastery, as the prototype did?
5. **5 questions** per egg round (prototype). The paddock is also 5.
6. **Naming.** The prototype let her name each hatchling at the ceremony; the
   rules keep no name yet. Add a name to `hatch(egg_id, name)` when the scene
   wants one (phrase-picked, never free text — rule 7)?
