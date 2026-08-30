# Redesign notes (post-playtest)

The original spec (`SPEC.md` / `original-spec.md`) deliberately had **no economy**:
feeding *was* the quiz, coins/pellets were display-only, and eggs filled purely from
general practice. After the user played it and got feedback from their daughter, the game
was redesigned toward a pet-care loop. This file records what changed and why; the older
docs still describe the original intent.

## The loop now

```
answer questions  →  earn coins  →  buy feed at the feed shed
                                         ↓
        feed / water / clean / play each animal  (each = a short question round)
                                         ↓
        every animal, every task, once per day   →  "Goodnight" summary
```

Coins still come **only** from graded answers (FLUENT pays 2, a plain correct pays 1,
wrong pays 0) — so the economy adds a resource layer without giving a way to progress
that skips practice. Feeding consumes 3 feed; watering / cleaning / play are free.

## What changed

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
- `care.ts` — **new**: `CareTask`, `AnimalCare`, `CARE_*` tables.
- `scheduler.ts` — `Scheduler.nextInFamily(family)` for egg practice.
- `quiz.ts` — `SessionContext` gains `'egg'`; `QuizPanelProps.practiceFamily`.
- `creature.ts` — `CreatureParams` reshaped; `AnimalKind` added.
- `navigation.ts` — `Screen` gains `'feedshed'`.

## Still open / could improve

- The nest and feed-shed screens are functional but plainly styled.
- Egg practice that triggers a hatch mid-round doesn't log that session (the hatch
  ceremony pre-empts the quiz). The answers still count.
- `docs/SPEC.md`, `AGENTS.md`, per-track briefs still describe the original design.
- Not deployed to Vercel.
