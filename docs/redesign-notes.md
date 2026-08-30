# Redesign notes (post-playtest)

The original spec (`SPEC.md` / `original-spec.md`) deliberately had **no economy**:
feeding *was* the quiz, coins/pellets were display-only, and eggs filled purely from
general practice. After the user played it and got feedback from their daughter, the game
was redesigned toward a pet-care loop. This file records what changed and why; the older
docs still describe the original intent.

## The loop now

```
Paddock / Nest Hollow  →  earn coins  →  buy feed at the feed shed
                                              ↓
     feed / water / clean / play each animal  (each = a short question round,
     with a little scene that reacts to every correct answer)
                                              ↓
     every animal, every task, once per day   →  "Goodnight" summary
```

- **Coins are earned only in the paddock speed round and in egg practice at the nest.**
  Stall care earns no coins — the barn is where you *spend* and maintain.
- Feeding consumes 3 feed; watering / cleaning / play are free.
- Each animal has a **health bar** (0–100). Care raises it; a day with no care at all
  lowers it (`HEALTH_DECAY_PER_DAY`, capped, floor 15 — it never starves or leaves).
  At rest the animal smiles when health ≥ 66, looks glum below 34.
- Care rounds show a scene above the number pad: the trough fills with food/water, a
  broom sweeps a patch of a dirty stall away, or the animal does a little dance — one
  step per correct answer.

## What changed

Later still (2026-08-30, batch 3): each animal has a **health bar** (care raises it,
neglect decays it, floor 15); **care rounds show a reactive scene** (trough fills, broom
sweeps, animal dances per correct answer); **coins are earned only in the paddock and the
nest** (stall care earns none); the keeper is 2× and wears a cowboy hat; the 12 creatures
are distinct farm animals. Batch 4: a **petting zoo** by the pond (`home: 'barn' | 'zoo'`,
`moveAnimal`) and a **training ring** on the centre path (`TrainingScreen` — area model /
distributive property, ×10 anchor, doubling, near-squares; no quiz). Egg practice bug
fixed twice — `nextInFamily` now keeps ~4 family facts in rotation and drives the family
to full mastery.

| Area | Before | After |
| --- | --- | --- |
| Currency | `currency: { pellets, coins }`, display-only | `coins` (spendable) + `feed` (consumable). `SaveData` v2. |
| Feed shed | a modal showing totals | a real shop screen — buy a 10-feed sack for 6 coins |
| Stall | one "Feed" button = the quiz | four needs (Feed/Water/Clean/Play), each a round; meters per animal |
| Daily chores | ~20 questions, one feed per animal | every animal × 4 tasks per day |
| Nest / eggs | passive fill from all practice | still that, **plus** tap an egg for a family-targeted round to hatch it faster |
| Creatures | abstract blob from `{ bodyShape, earType, pattern, tail, ... }` | recognisable chibi baby animals — `CreatureParams` is now `{ animal, palette, eyeStyle }` |
| Farmyard art | flat 48px coloured tiles ("ugly blocks") | `FarmScene.tsx` — composed storybook scene; whole farm scaled to fit; sky + clouds |

## Contract changes (were "frozen"; the maintainer owns them now)

- `save.ts` — `SaveData` v2 (`coins`, `feed`, `care`); `SCHEMA_VERSION = 2`; `migrate` has a real v1→v2 step.
- `care.ts` — **new**: `CareTask`, `AnimalCare` (now incl. `health`), `CARE_*` / `HEALTH_*` tables.
- `scheduler.ts` — `Scheduler.nextInFamily(family)` for egg practice.
- `quiz.ts` — `SessionContext` gains `'egg'`; `QuizPanelProps.practiceFamily`.
- `creature.ts` — `CreatureParams` reshaped; `AnimalKind` added; `CreatureMood` gains `content` / `sad`.
- `navigation.ts` — `Screen` gains `'feedshed'`.
- `gameState` — `onGraded(result, { earnsCoins })`; the paddock and nest pass `earnsCoins: true`.
- `src/barn/CareScene.tsx` — **new**: the per-answer care scene (trough / broom / dance).

## Still open / could improve

- The nest and feed-shed screens are functional but plainly styled.
- Egg practice that triggers a hatch mid-round doesn't log that session (the hatch
  ceremony pre-empts the quiz). The answers still count.
- `docs/SPEC.md`, `AGENTS.md`, per-track briefs still describe the original design.
- Not deployed to Vercel.
