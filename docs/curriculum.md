# Curriculum

What the game teaches, in what order, and how "mastered" is decided. Every
number here mirrors `packages/domain/src/facts/tuning.ts`; if the two disagree,
one of them is wrong — fix it, don't paper over it. Common Core references are
CCSS-M codes (e.g. 3.OA.C.7).

## 1. Alpha scope — multiplication 1–12

The alpha fact table is every **ordered** pair `a×b` with 1 ≤ a, b ≤ 12: 144
facts. `7×8` and `8×7` are distinct facts (see commutativity, §2).

| Range | Why |
| --- | --- |
| **1–12, not 0–12** | `MIN_TABLE = 1`; `buildFacts` starts at 1. `0×n` is a rule ("anything times zero is zero"), not a retrievable fact — scheduling 25 more cards that are mastered on sight would only dilute the queue. **Open question** (§6); recommendation: keep 0 out of the table, show the zero rule once in the training ring. |
| **Up to 12, not 10** | CCSS fluency stops at one-digit × one-digit (products to 81; "within 100"). We keep 11s and 12s because they are still the expected tables in most classrooms and homes, they pay off directly in time (12 hours, dozens), measurement (12 inches) and in fraction work with twelfths, and `12×7 = 10×7 + 2×7` is the first real use of the distributive property (3.OA.B.5). `maxTable` is per-save (`FarmSettings.maxTable`), so a strict-CCSS child can play to 10. |

| CCSS | What it asks | How the alpha covers it |
| --- | --- | --- |
| **3.OA.C.7** | Fluently multiply within 100; by end of grade 3 know all one-digit products from memory | The whole engine: latency-graded recall of 1–9 × 1–9 (and beyond) |
| 3.OA.B.5 | Apply properties of operations (commutative, distributive) | Commutativity credit (§2); training ring decompositions (area model, ×10 anchor, doubling, near-squares) |
| 3.OA.D.9 | Identify arithmetic patterns and explain them | The tier order itself: ×1/×2/×10 rules, ×5, squares, the 9s digit-sum trick |
| 3.NBT.A.3 | Multiply one-digit numbers by multiples of 10 | ×10 anchors |
| 4.OA.B.4 | Factor pairs, multiples, prime/composite in 1–100 | Not in alpha — first expansion (§5) |

## 2. Fact ordering

### Introduction tiers

Never introduce all 144 at once. A fact's tier is the **first** rule it matches,
evaluated top to bottom (`tierOf`). Sizes count both operand orders.

| Tier | Name | Rule (first match wins) | Facts | Why here |
| --- | --- | --- | --- | --- |
| 1 | Anchors | either operand is 1, 2 or 10 | 63 | Rules, not facts. Instant wins on day one; every later fact hangs off these. |
| 2 | Easy patterns | either is 5 · or a square (a = b) · or 11 with the other ≤ 9 | 37 | Skip-counting by 5, the "same number twice" pattern, the 11s repeat-digit pattern. Cheap confidence, and squares become anchors for near-squares later. |
| 3 | The 3s and 4s | either is 3 or 4 | 22 | Doubling (×4 = double-double) and the first real memorisation load. |
| 4 | The 9s | either is 9 | 8 | Isolated so the digit-sum / "one less than ×10" trick lands once, cleanly. |
| 5 | The 6s, 7s, 8s | either is 6, 7 or 8 | 12 | The genuine core — every hard-core fact lives here. Deliberately last among the one-digit tables so the anchors around them are solid. |
| 6 | The 12s | everything else | 2 | Only `11×12` / `12×11` survive the earlier rules; the other 12s are introduced alongside their partner table (`12×4` is a 4s fact). See §6. |

Within a tier, facts are introduced in table order (`1×1, 1×2, …`), steered away
from whichever family the interleave rule currently blocks.

### The hard-core set

Ten facts kids most often stall on, matched in either order: **7×8, 6×8, 7×6,
8×9, 7×9, 6×7, 8×8, 7×7, 12×7, 12×8**. Once introduced they are over-sampled:
when more than 6 facts are due, selection is weighted and a hard-core fact gets
`+3` (vs. `+2` for any fact still in box ≤ 2 and `×2` per question overdue). The
PRD's first success signal is the latency trend on exactly this set; if 7×8 is
still slow after weeks, raise `WEIGHT_HARD_CORE_BONUS`.

### Commutativity credit

`a×b` and `b×a` are separate cards, but a **correct** answer on one (fluent, slow
or labored) banks **half a box** for its twin; two credits = one real promotion,
re-queued at the new box's interval. It never demotes, never touches a twin that
is un-introduced or already at box 5, and squares have no twin. The fraction is
persisted so a reload can't lose it. Noticing 7×8 = 8×7 is real maths (3.OA.B.5);
the game rewards it quietly instead of asking twice.

## 3. How mastery works

Time is **questions asked** (`globalCounter`), never the wall clock — a child
who plays twice a week is scheduled the same as one who plays daily.

**Outcome of one answer** — correctness first, then latency:

| Outcome | Condition | Box | Comes back after |
| --- | --- | --- | --- |
| FLUENT | correct, < 3 s | up one (max 5) | the new box's interval |
| SLOW | correct, 3–8 s | holds | 3 questions (`min(previous, box 1)`) |
| LABORED | correct, > 8 s | down one (floor 1) | the new box's interval |
| WRONG | incorrect | reset to 1 | 3 questions |

**Leitner boxes** — box 0 = not yet introduced; a freshly introduced fact sits
in box 1 and is due immediately.

| Box | 1 | 2 | 3 | 4 | 5 (mastery) |
| --- | --- | --- | --- | --- | --- |
| Re-queue after (questions) | 3 | 8 | 20 | 60 | 150 |

**Mastered** = box 5 **and** the last 3 answers all fluent (< 3 s). The fastest
path is four fluent answers spread over ~90 questions (8 + 20 + 60 between them); a fact
can leave "mastered" again, since a labored answer demotes it.

**Tier unlock** — the next tier opens when **80%** of the current highest tier's
facts sit at **box ≥ 3**. Checked after every graded answer and every `next()`.

**Selecting the next fact** (mixed practice, `nextFact`):

| Situation | Serve |
| --- | --- |
| fewer than 2 facts due and an unlocked tier still has un-introduced facts | introduce the next one |
| nothing due | the introduced fact with the worst rolling mean latency (last 5 answers) |
| 1–6 due | the most overdue |
| more than 6 due | weighted pick: `overdue × 2`, `+3` hard-core, `+2` if box ≤ 2 |

**Interleave** — never the same family more than **2 in a row**. If every due
fact is the blocked family, introduce a fresh fact from another family or pull
another family's soonest-due fact forward rather than break the rule. Relaxed
only when the board has a single family. Blocked practice ("drill the 6s") looks
great in-session and retains badly.

**Cold start** — a fresh save has tier 1 unlocked and families **1, 2, 10**
already introduced (23 facts in box 1, due now). Day one is never an empty barn.

## 4. How the farm maps onto the curriculum

| Curriculum | Farm |
| --- | --- |
| **Family** = the larger operand (`max(a, b)`); family *n* holds 2n−1 facts (family 12 = 23 facts, spread across every tier) | One animal / one egg per family — 12 in all. The cold-start families 1, 2, 10 are the day-one animals. |
| Family progress = share of its facts at box ≥ 3, capped at 0.98 until every fact is mastered | Egg visual: dull → glowing → cracked. It can look "almost" but never full early. |
| **Family mastered** = every fact in it mastered (`familyJustMastered` event) | The egg **hatches**. |
| Egg practice (`nextFactInFamily`) — keeps ~**4** unmastered facts of the family in rotation, introducing the family's next fact in table order to top up; picks by need (lowest box, then most overdue, then slowest); never the same fact twice running; ignores the cross-family interleave rule on purpose | Tap an egg at the nest for a family-targeted round. Note: this can pull a family's facts ahead of their tier — a deliberate "I want *this* one" lever. |
| Mixed practice (`nextFact`) | Care tasks (feed / water / clean / play), the paddock 60 s round, free play. |
| Coins: fluent 2, slow / labored 1, wrong 0 — **only** in the paddock and at the nest (`contextEarnsCoins`) | Care earns nothing; the barn is where coins are spent. Math advances; exploration reveals. |
| Answer input | A number pad. Never multiple choice, in any curriculum. |

## 5. Planned expansions

### Curriculum as data

Today the scheduler reaches into multiplication-specific lookups: `buildFacts`
/ `getFact` (the 12×12 table), `familyOf = max(a, b)`, `tierOf(a, b)`,
`commuteId` (parses `"AxB"`), `isHardCore`, and `SchedulerState.maxTable`. The
Leitner boxes, latency outcomes, interleave, tier-unlock and selection logic are
already generic. The expansion work is to move the former behind one value:

```
Curriculum {
  id                            // 'multiplication' | 'factors' | …
  facts: Fact[]                 // id, prompt, answer, family, tier, hardCore, twins[]
  families: { id, label }[]     // what an egg / animal stands for
  tiers: { name, unlockShare }[]
  grader(given, latencyMs) → Outcome     // per-curriculum latency thresholds
}
```

`SchedulerState` gains a `curriculumId` and drops `maxTable`; a save holds one
state per curriculum. Commutativity generalises to `twins`. The farm side needs
one new animal set per curriculum (or a second barn). Nothing in `apps/web`
learns any maths.

| Expansion (order) | CCSS | A "fact" | Family / tier analogue | The number pad answers | Domain change beyond the `Curriculum` value |
| --- | --- | --- | --- | --- | --- |
| **1. Factors** | 4.OA.B.4 (also 3.OA.A.4) | "all factor pairs of *n*", n ≤ 100 — plus missing-factor facts `a × ? = c` as the on-ramp | Family = a band of *n* (1–20, 21–40, …); tiers by pair count, then size. `hardCore` = numbers with 4+ pairs (24, 36, 48, 60, 72). | Each factor in turn, then Done. Prime/composite is asked as "how many factors?" — never yes/no. | A **multi-entry grader**: correct = full set, no wrong entries; latency = total ÷ entries. First proof that curriculum-as-data works. |
| **2. Division fact families** | 3.OA.C.7, 3.OA.B.6 | `c ÷ a = ?` for every alpha product | Same families and tiers as multiplication — the hatched animal "grows up". `twins` = the three siblings of the fact family. | The quotient. | None beyond ids (`72/8`) and prompt shape. Cheapest expansion. |
| **3. Arrays & area** | 3.MD.C.7 (a–d), 3.OA.B.5 | A rectangle shown as a grid or with side lengths: "how many tiles?", "one side is 6, area 42 — the other?", "split 7×8 at 5: the two parts?" | Same families; tiers by representation (count → sides → distributive split). | The area, the missing side, or each partial product. | A fact needs a **representation** field the scene renders; the distributive split is a two-entry grader. Reuses the training ring's area model. |
| **4. Fractions** | 3.NF.A.1–3, 4.NF.A.1, 4.NF.B.4 | Equivalence with a missing number (`2/3 = ?/12`), fraction of an amount (`3/4 of 12`), simplification (`6/8 = 3/?`) | Family = the denominator; tiers 2/4/8 → 3/6/12 → 5/10 → mixed. | A whole number; a two-field numerator/denominator pad for full-fraction answers (still a pad). Comparison ("which is bigger") is a choice — reframed as "how many twelfths bigger?" or left out. | Answers may be pairs (grade on reduced form); **slower latency thresholds** — a fraction-of-an-amount is two steps, so "fluent < 3 s" is the wrong bar. |

Not planned: anything whose natural answer is a choice from options.

## 6. Open questions for James

- **0×** — leave out of the table (recommended) or add as 25 auto-mastered cards
  so the "0–12" language matches the game?
- **Tier 6 is two facts.** `tierOf` first-match order puts `12×3` in the 3s,
  `12×7` in the 6/7/8s, and so on; only `11×12` reaches "The 12s". Accept (the 12
  egg is still last to hatch, and 12×7 *is* a 7s fact) and rename tier 6, or
  reorder the rules so all 12s land last as the original spec intended?
- **Egg practice bypasses tier gating.** Fine as a lever, or should the nest only
  show eggs whose tier has unlocked (the prototype's rule)?
- **Cold-start animals** = families 1, 2, 10. Confirm these are the three alpha
  animals, since family 1 is a single fact (`1×1`) and hatches almost instantly.
- **Latency thresholds** — 3 s / 8 s are one setting for every age. Per-child
  tuning (or per-curriculum, see §5) before or after alpha?
- **Expansion order** — Factors first (the plan's choice) or Division first (the
  cheapest and the one 3.OA.C.7 actually pairs with multiplication)?
