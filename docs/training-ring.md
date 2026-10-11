# Training ring rules (SF-109)

The rules half of the training ring: strategy practice from the PRD (area
model, ×10 anchor, doubling, near-square), as pure GDScript in
`game/domain/training/` with the use-cases on `FarmGame`. The ring scene —
including any drawn area-model grid — binds to the read-model below and
decides nothing. Every number here is a constant in one place.

The prototype is in git history before the rebuild commit `db9c208`
(`git show db9c208^:src/game/screens/TrainingScreen.tsx`). It was "no quiz, no
score": the steps were shown, not answered. The rebuild keeps its strategies
and numbers but has the child **type each step on the pad** (game rule 1),
which is the one change from the prototype.

## The rules and where they come from

| Rule | Value | Where in code | Source |
| --- | --- | --- | --- |
| Facts offered | 6×7, 7×8, 6×8, 7×9, 8×9, 8×8, 7×7, 4×8, 6×6, 9×12, in that order, within the farm's table size | `TrainingRing.PRACTICE_FACTS`, `offered_facts` | prototype `TrainingScreen.tsx:9-11` |
| Any fact may be trained | every fact of the table with at least one strategy; the scene shows the offered ones | `TrainingRing.check_fact` | decision (the domain covers all 144; the list is a scene choice) |
| "Pick one for me" | `start_training("")` draws an offered fact with the injected `Rng` | `TrainingRing.pick_fact` | decision (the prototype opened on 7×8) |
| Which number is broken down | always b, the second operand; a × b and b × a are separate facts | `Strategies.for_fact` | prototype `strategiesFor(a, b)` |
| Strategy order | area model, ×10 anchor, doubling, near-square — each only when it suits | `Strategies.for_fact` | prototype `TrainingScreen.tsx:20-78` |
| Area model | b ≥ 6 splits into 5 and b − 5; below 6 into halves (smaller first); b = 1 does not split. Steps: a × p, a × q, then the sum | `Strategies.area_split`, `SPLIT_AT_FIVE_FROM` | prototype `:24` (`b >= 6 ? [5, b - 5] : [floor, ceil]`); 3.OA.B.5 (curriculum.md §1) |
| ×10 anchor | b from 6 to 12, not 10. Steps: a × 10, a × \|10 − b\|, then take away (b < 10) or add (b > 10) | `Strategies.TEN_ANCHOR_MIN/MAX` | prototype `:37`; 3.NBT.A.3 |
| Doubling | b even. Steps: a × b/2, then "double" it | `Strategies._doubling` | prototype `:54` |
| Near-square | \|a − b\| = 1. Steps: a × a, a × 1, then add (b > a) or take away | `Strategies.NEAR_SQUARE_DISTANCE` | ticket ("near-square for n×(n±1)"); the prototype used any a ≠ b (`:64`) — see Q2 |
| Steps per strategy | 3, doubling 2; the last step's answer is always a × b | `Strategy.steps` | prototype step lists |
| Nothing to break down | a × 1 (except 2 × 1, a near-square) has no strategy and is refused | `TrainingRing.NOTHING_TO_BREAK_DOWN` | follows from the rules above |
| A step is right | the typed number equals the step's answer exactly | `WorkedStep` | as `Grading` compares |
| A wrong step | shown worked out and the strategy moves on; later steps use the right numbers | `TrainingRing.answer_step` | CLAUDE.md rule 6 |
| The whole | done when every step is answered; `all_correct` when every step was right first time | `TrainingRing.all_correct` | ticket |
| Another way | the fact's next strategy from its first step, wrapping to the first | `TrainingRing.another_way` | prototype "Show me another way" (`:172`) |
| **Mastery** | **strategy steps never reach the scheduler**: no fact is promoted, held or dropped, no egg grows | `FarmGame.answer_step` (no `Grading` call) | decision — spec is silent; steps are scaffolded, not recall (rule 3) |
| Rewards | none: no coins, no feed, no save, no log entry, no day tally | `FarmGame.answer_step` | prototype (no score); CLAUDE.md rule 2 (coins only in paddock and nest) |
| Persistence | none; a reload leaves the ring empty. Save stays v4 | `FarmGame._training` | nothing in the spec needs it |
| Goodnight | `start_training` refused with `PlaySession.GOODNIGHT`; a training under way finishes (`answer_step`, `another_way`, `end_training` are never refused for time) | `FarmGame._ready_to_start` | session.md (a running round finishes) |
| Play time | starting training counts as play, like starting a round | `FarmGame.start_training` | session.md "What counts" |
| One thing at a time | no round, care or egg starts while training is under way, and no training during a round | `FarmGame._ready_to_start` | decision |
| Where | the centre path | (scene) | redesign-notes.md:37 |

CCSS: 3.OA.B.5 (distributive property — area model, ×10 anchor, near-square),
3.NBT.A.3 (multiples of 10), per `curriculum.md` §1.

## What the scene binds to

- `FarmGame.ring() -> Result` → `RingSummary`: `offered_facts` (fact ids) and
  `training` (`TrainingSummary` or null).
- `start_training(fact_id = "") -> Result` → `TrainingSummary`:
  `fact_id`, `a`, `b`, `strategy` (a `Strategy` key), `strategies` (every key
  for the fact, in order), `hint` (the sentence's numbers: area model
  `{parts}`, ×10 anchor and near-square `{from, by, direction}`, doubling
  `{half}`), the area model grid `rows` × `cols` split before column
  `split_at` (0 = no split; the prototype drew it for every strategy, `:83`),
  `step_count`, `current_step` (`StepPrompt`: `left`, `op`, `right` — **no
  answer**), `worked` (`WorkedStepSummary`: the prompt plus `answer`, `given`,
  `correct`), `done`, `all_correct`.
- `answer_step(given) -> Result` → `StepFeedback`: `worked` (the step just
  answered, worked out), `training` (after it), `sound` (`Sounds.CORRECT` /
  `WRONG`).
- `another_way() -> Result` → `TrainingSummary`; `end_training() -> Result`.
- Refusals: `FarmGame.NO_TRAINING`, `TrainingRing.UNKNOWN_FACT`,
  `NOTHING_TO_BREAK_DOWN`, `STRATEGY_DONE`, `PlaySession.GOODNIGHT`.
- Ops: `StrategyStep.TIMES`, `PLUS`, `MINUS`, `DOUBLE` (show "double 28"; the
  sum is 28 × 2).

## Open tuning questions for James

1. **Typed steps** replace the prototype's read-only walkthrough. Keep a
   "just show me" option that reveals all steps without typing?
2. **Near-square** is limited to neighbours (7×8, 8×7). The prototype offered
   it for any pair (7×9 = 7×7 + 7×2; even 9×2 = 9×9 − 9×7). Widen to a
   distance of 2, or to any pair as before?
3. **Which number splits**: always b. For 12×3 that splits the 3 rather than
   the 12. Split the larger operand instead?
4. **Mastery**: steps never count. Should finishing a strategy cleanly give the
   fact a gentle nudge (e.g. bring it forward in the queue) without promoting it?
5. **Offered facts** are the prototype's ten. Offer the child's slowest
   introduced facts instead (the hard-core set, by latency)?
6. **No reward at all.** A cosmetic one (the trainee animal does a trick) is
   the scene's to add; should anything be counted, e.g. strategies tried?
