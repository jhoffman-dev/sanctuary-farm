# Sanctuary Farm — build spec (revised)

A multiplication-fluency game for a 10-year-old, built as a browser app.

This is the canonical spec. It folds the multi-agent scaffolding and resolved
ambiguities into the original (`docs/original-spec.md`, kept for provenance).

- **Contracts:** `docs/CONTRACTS.md` (readable), `src/contracts/*.ts` (authoritative, frozen)
- **Orchestration + file ownership:** `docs/AGENTS.md`
- **Per-track briefs:** `docs/tracks/track-{a,b,c,d,e}.md`
- **Resolved ambiguities:** `docs/resolved-decisions.md`
- **Working notes (commands, rules):** `../CLAUDE.md`

---

## 1. Gameplay summary

The player is the keeper of a small farm. The view is **top-down and walkable**: she taps
where she wants to go and her character walks there along the paths. The farmyard holds a
barn, a paddock, a nest hollow, a feed shed, and a farmhouse.

Inside the **nest hollow**, eggs appear as she progresses. Each egg corresponds to one
multiplication family — the 3s, the 7s, the 8s. An egg's hatch meter is that family's
mastery meter. When the family is mastered, the egg hatches and a new creature moves into
the barn permanently.

Walking into the **barn** switches to a side-on screen view: a row of stalls, one creature
per stall. Tapping a stall opens that creature's care panel. The creature is hungry, and
**feeding it is the quiz** — a number pad comes up right there in the stall and she answers
four or five multiplication questions. Correct answers become food; the creature eats, and
reacts. There is no schoolhouse, no separate "math mode." The math happens where the
animals are.

The **paddock** is a sixty-second speed round for facts she already knows, framed as a
feeding frenzy — beat your own best, never anyone else's.

### The one rule that holds the design together

**Exploration reveals. Math advances.** Walking around the farm can *show* her things — a
new nest, an egg that has started to crack, a creature that's hungry. It can never *earn*
anything. Every pellet, every coin, and every point of egg progress comes from answering a
question and from nothing else.

### What success looks like

She answers any fact from 1×1 to 12×12 correctly in **under three seconds**, without
visible computation. Everything else exists to make her want to open the game tomorrow.

---

## 2. Stack

See `../CLAUDE.md` for the exact, as-built versions (Vite 8 / React 19 / TS strict /
Tailwind 4 / `motion` / Vitest). The original "React 18 / Framer Motion" line is superseded;
everything else stands:

- Inline SVG for **all** art. No image files, no sprite sheets, no external assets.
- Web Audio API, oscillator-synthesized. No audio files.
- `requestAnimationFrame` loop for character movement (not `motion`).
- `localStorage` for persistence. No backend, no network calls at runtime.
- **Do not add** a game engine, state library, UI component library, or pathfinding package.

---

## 3. Phase 0 — contracts (done)

Delivered: project scaffold, Vitest, `src/contracts/` (all shared types + `constants.ts` +
`rng.ts`), `// STUB` implementations at every cross-track path, glob-based dev-route
registry, `CLAUDE.md`. Every dev route renders; `dev`/`test`/`typecheck`/`lint`/`build` all
green. See `docs/CONTRACTS.md`.

Key revisions vs the original type sketch: `grade()` returns `GradeResult` (D1);
`familyProgress`/`isMastered` reconciled (D2); `Fact` gains `tier`/`hardCore`;
`SaveData` gains `scheduler`, `settings.maxTable`, `importJSON`, `reset` (D8);
`Scheduler` construction via `initialSchedulerState()` + `createScheduler()`.

---

## 4–8. Tracks A–E

Each track: owns its files (see `docs/AGENTS.md`), depends only on Phase 0, ships a
standalone dev route, ends with green typecheck/lint/test/build. Full briefs and acceptance
tests in `docs/tracks/`.

- **A — Learning engine** (`src/engine/`). Pure TS, zero React. Leitner boxes counted in
  questions asked; latency is the primary promotion signal; commutativity half-promotes the
  twin; six introduction tiers; interleave families (never 3× consecutively); hard-core set
  over-sampled. **This is the only component that teaches her anything — protect it.**
- **B — Quiz loop** (`src/quiz/`). Self-contained `QuizPanel(scheduler, mode) → onComplete`.
  Number pad only, never multiple choice. No auto-submit. Latency measured per D7. Wrong
  answer → creature looks *puzzled* (not sad), show the fact + a dot-array, she types it
  once, engine requeues it 3 questions later. No shame, no streak reset.
- **C — Farmyard world** (`src/world/`). 25×18 tiles @ 48px. Tap-to-move with A* (~60
  lines, no library). Dead-zone follow camera clamped to bounds. Arrow/WASD as secondary
  input. No d-pad. Entering a hotspot = walking onto its tile.
- **D — Creatures, art, barn** (`src/creatures/`, `src/barn/`). Soft-vector storybook, not
  pixel art. 12 creatures built procedurally from `CreatureParams`, five moods each — spend
  the effort on **motion, not detail**. Barn is side-on; `StallPanel` mounts `QuizPanel`.
  The stall does **not** filter which facts are asked (D11).
- **E — Persistence, audio, dashboard** (`src/save/`, `src/audio/`, `src/parent/`). One
  versioned `localStorage` key, `migrate()` from day one, export/import JSON. Save on every
  graded answer. Synthesized audio (`fluent` audibly better than `correct`; `wrong` is a
  soft neutral tone, never a buzzer). Parent dashboard behind a long-press + gate: 12×12
  heatmap by box level with mean latency per cell, ten slowest facts, questions/minutes per
  day for 14 days, accuracy trend, export + reset.

---

## 9. Phase 2 — integration

Single agent, after A–E land. Replace stubs with real impls, wire the screen graph:

```
farmyard ⇄ barn ⇄ stall
   ⇅
 nest, paddock, feedshed, farmhouse → summary
```

- **Cold start** (D6): fresh save introduces families 1/2/10; barn opens with the family-10
  creature as a gift (stallIndex 0, no egg ceremony); families 1 & 2 show eggs. Never open
  on an empty barn.
- **Daily chores:** once per calendar day every stall has a hungry creature; clearing all
  stalls is ~20 questions and is the day's session. When done, the game says goodnight — no
  "just one more."
- **Eggs:** a new egg appears when its tier unlocks; visual state tracks `familyProgress()`
  (dull / glowing / cracked / hatching per `constants.ts`). Hatching fires on the next visit
  to the nest after mastery — full-screen, unskippable the first time only.
- **Sync:** on every graded answer, persist `scheduler.snapshot()` into `SaveData.scheduler`
  and mirror into `SaveData.facts`.
- Flip `src/main.tsx` to render `<App/>` (drop the `?app=1` guard).

---

## 10. Phase 3 — polish and ship

Sound pass, animation timing, transition feel, production build, Vercel static deploy.
Home-screen PWA meta is already in `index.html`; add `manifest.webmanifest` + a maskable
icon. Bookmark it on her iPad so it opens without browser chrome.

---

## 11. Non-negotiable rules

Carried verbatim into `../CLAUDE.md`. Hold the line on all eight: no multiple choice;
exploration reveals / math advances; no punishment for absence; no social/leaderboards/
links/ads/purchases; latency drives promotion; sessions end on time; interleave families;
all art and audio generated in code.

---

## 12. After it ships

Watch the dashboard for two weeks. The number that matters is not accuracy — it's the
**latency distribution on the hard-core set**. If 7×8 still averages four seconds after two
weeks of daily play, raise `WEIGHT_HARD_CORE_BONUS` in `constants.ts`. Then ask her what
creature she wants next, and build that.
