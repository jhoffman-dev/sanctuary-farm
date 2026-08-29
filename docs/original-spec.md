# Sanctuary Farm — Build Spec

A multiplication-fluency game for a 10-year-old, built as a browser app.

> **How to use this document.** Phase 0 must be completed first by a single agent — it defines the contracts every other track compiles against. Tracks A–E are then independent and can run in parallel in separate sessions or worktrees. Each track owns its own files, depends only on Phase 0, and ships with a standalone dev route so it can be run and tested without the other tracks existing. Integration is Phase 2.

---

## 1. Gameplay summary

The player is the keeper of a small farm. The view is **top-down and walkable**: she taps where she wants to go and her character walks there along the paths. The farmyard holds a barn, a paddock, a nest hollow, a feed shed, and a farmhouse.

Inside the **nest hollow**, eggs appear as she progresses. Each egg corresponds to one multiplication family — the 3s, the 7s, the 8s. An egg's hatch meter is that family's mastery meter. When the family is mastered, the egg hatches and a new creature moves into the barn permanently.

Walking into the **barn** switches to a side-on screen view: a row of stalls, one creature per stall. Tapping a stall opens that creature's care panel. The creature is hungry, and **feeding it is the quiz** — a number pad comes up right there in the stall and she answers four or five multiplication questions. Correct answers become food; the creature eats, and reacts. There is no schoolhouse, no separate "math mode." The math happens where the animals are.

The **paddock** is a sixty-second speed round for facts she already knows, framed as a feeding frenzy — beat your own best, never anyone else's.

### The one rule that holds the design together

**Exploration reveals. Math advances.**

Walking around the farm can show her things — a new nest, an egg that has started to crack, a creature that's hungry. It can never *earn* anything. Every pellet, every coin, and every point of egg progress comes from answering a question and from nothing else. There is no foraging, no idle income, no minigame that pays out, no tap-the-crop. The moment the world becomes a second way to make progress, it becomes a way to avoid practising.

### What success looks like

She answers any fact from 1×1 to 12×12 correctly in **under three seconds**, without visible computation. Everything else in this document exists to make her want to open the game tomorrow.

---

## 2. Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- Framer Motion — UI transitions and creature idle animations only
- A plain `requestAnimationFrame` loop for character movement (not Framer Motion)
- Inline SVG for **all** art. No image files, no sprite sheets, no external assets.
- Web Audio API for sound, oscillator-synthesized. No audio files.
- `localStorage` for persistence
- No backend, no accounts, no network calls at runtime
- Deploy: Vercel static build

**Do not add** a game engine, a state management library, a UI component library, or a pathfinding package. Everything here is small enough to write directly and the dependencies cost more than they save.

---

## 3. Phase 0 — Contracts (sequential, do this first)

One agent, one sitting. Produces no features. Its only job is to make Tracks A–E able to proceed without blocking each other.

**Deliverables:**

1. Vite + React + TS + Tailwind project scaffold, `npm run dev` works.
2. Vitest configured, `npm test` works.
3. `src/contracts/` — every shared type in this document, exported. No implementations.
4. Stub implementations of every cross-track module: correct signatures, hardcoded plausible return values, `// STUB` comment at the top of each. Tracks replace their own stubs.
5. `src/dev/DevRoutes.tsx` — a hash-router listing every dev route. Each track registers one.
6. `CLAUDE.md` at repo root containing sections 1, 2, and 12 of this document.

**Definition of done:** every track's dev route loads and renders a placeholder without errors.

### Core types

```ts
// src/contracts/facts.ts
export type Fact = {
  id: string;        // "7x8"
  a: number;         // 1..12
  b: number;         // 1..12
  answer: number;
  family: number;    // larger operand — determines which egg
};

export type Box = 0 | 1 | 2 | 3 | 4 | 5;

export type FactState = {
  id: string;
  box: Box;
  dueAt: number;                 // global question counter, not wall clock
  lastLatencyMs: number | null;
  recentLatencies: number[];     // rolling, max 5
  correctStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  introduced: boolean;
};

export type Outcome = 'FLUENT' | 'SLOW' | 'LABORED' | 'WRONG';
```

```ts
// src/contracts/scheduler.ts
export interface Scheduler {
  next(): Fact;
  grade(factId: string, given: number, latencyMs: number): Outcome;
  familyProgress(family: number): number;   // 0..1, share of family at box 3+
  isMastered(family: number): boolean;
  snapshot(): SchedulerState;
}
```

```ts
// src/contracts/creature.ts
export type CreatureParams = {
  bodyShape: 'round' | 'tall' | 'wide' | 'lumpy';
  palette: [string, string, string];
  earType: 'none' | 'pointy' | 'floppy' | 'round' | 'antenna';
  eyeStyle: 'big' | 'sleepy' | 'sparkly' | 'wide';
  pattern: 'none' | 'spots' | 'stripes' | 'star';
  tail: 'none' | 'puff' | 'long' | 'curl';
};

export type CreatureMood =
  | 'idle' | 'happy' | 'eating' | 'puzzled' | 'sleeping';

export type HatchedCreature = {
  family: number;
  name: string;          // player-assigned, defaults provided
  params: CreatureParams;
  hatchedAt: number;     // epoch ms
  stallIndex: number;
};
```

```ts
// src/contracts/world.ts
export type TileType = 'grass' | 'path' | 'fence' | 'water' | 'building';

export type Vec2 = { x: number; y: number };

export type Hotspot = {
  id: 'barn' | 'paddock' | 'nest' | 'feedshed' | 'farmhouse';
  tile: Vec2;            // tile the player must reach to trigger
  label: string;
};

export type Screen =
  | 'farmyard' | 'barn' | 'stall' | 'paddock'
  | 'nest' | 'summary' | 'dashboard';
```

```ts
// src/contracts/save.ts
export type SaveData = {
  schemaVersion: 1;
  facts: Record<string, FactState>;
  globalCounter: number;
  creatures: HatchedCreature[];
  currency: { pellets: number; coins: number };
  sessions: SessionLog[];
  settings: { muted: boolean; maxTable: number };
  lastChoresDate: string | null;   // YYYY-MM-DD
};

export interface SaveStore {
  load(): SaveData;
  save(data: SaveData): void;
  migrate(raw: unknown): SaveData;
  exportJSON(): string;
}
```

```ts
// src/contracts/audio.ts
export type SoundName =
  | 'correct' | 'fluent' | 'wrong' | 'hatch'
  | 'tap' | 'footstep' | 'doorOpen' | 'chew';

export interface AudioBus {
  play(name: SoundName): void;
  setMuted(muted: boolean): void;
}
```

---

## 4. Track A — Learning engine

**Owns:** `src/engine/facts.ts`, `src/engine/scheduler.ts`, `src/engine/scheduler.test.ts`
**Depends on:** Phase 0 only
**Dev route:** `#/dev/scheduler` — a simulation harness that runs 500 synthetic answers against configurable accuracy and latency profiles, then prints the resulting box distribution and family progress.

This track has **zero React imports**. It is pure TypeScript and it is the only part of the project that actually teaches her anything. If evenings get eaten, this is the one that must not be compromised.

### Latency is the primary signal

A correct answer that took seven seconds was computed, not recalled. Grade every answer:

| Outcome | Condition | Effect on box |
| --- | --- | --- |
| `FLUENT` | correct, < 3000 ms | promote one |
| `SLOW` | correct, 3000–8000 ms | unchanged, re-queue sooner |
| `LABORED` | correct, > 8000 ms | demote one (floor 1) |
| `WRONG` | incorrect | reset to 1 |

The UI track is responsible for measuring latency correctly (see Track B); this track only consumes the number.

### Leitner intervals

Counted in **questions asked**, using a monotonic global counter that persists across sessions. Wall-clock intervals break down when sessions are five minutes long.

```
box 1 → due in 3 questions
box 2 → due in 8
box 3 → due in 20
box 4 → due in 60
box 5 → due in 150 (mastered)
```

**Mastered fact** = box 5 with the last three latencies all under 3000 ms.
**Mastered family** = every fact in the family mastered.

### Commutativity

Present `a×b` and `b×a` as separate facts, but a correct answer on one promotes its twin by **half a box**, and never demotes it. Noticing that 7×8 and 8×7 are the same thing is a real mathematical insight and the game should quietly reward it.

### Introduction tiers

Never introduce all 144 facts. Unlock the next tier when 80% of the current tier is at box 3 or higher:

1. **Anchors** — ×1, ×2, ×10. These are rules, not facts.
2. **Easy patterns** — ×5, ×11 up to 9, and the squares
3. **The 3s and 4s**
4. **The 9s** — surface the digit-sum trick once, the first time
5. **The 6s, 7s, 8s** — the genuine core
6. **The 12s**

**Hard-core set**, tracked by name and over-sampled once introduced: `7×8, 6×8, 7×6, 8×9, 7×9, 6×7, 8×8, 7×7, 12×7, 12×8`.

### Interleaving

Never present the same family more than twice consecutively. Blocked practice — drilling the 6s in a run — produces good performance during the session and poor retention after it. The queue builder must shuffle across families even when the due list is family-clustered.

### Selection, each call to `next()`

1. Collect facts where `introduced && dueAt <= globalCounter`.
2. If more than six are due, weight by: `overdueAmount × 2`, `+3` if hard-core, `+2` if `box <= 2`. Sample by weight.
3. Apply the interleaving filter. If it eliminates every candidate, relax it.
4. If fewer than two are due and a tier is unlocked, introduce a new fact instead.
5. If nothing is due at all, serve the fact with the worst rolling mean latency.

### Track A acceptance tests

- A correct-but-slow answer (5000 ms) does not advance a fact to box 5.
- A `LABORED` answer demotes; a fact at box 1 stays at box 1.
- A wrong answer resets to box 1 regardless of prior box.
- Across 200 generated questions, no family appears three times consecutively.
- Answering 7×8 correctly raises 8×7's effective progress without ever lowering it.
- Tier 3 does not unlock while tier 2 is below 80% at box 3+.
- `familyProgress` returns exactly 1.0 only when every fact in the family is mastered.

---

## 5. Track B — Quiz loop and number pad

**Owns:** `src/quiz/QuizPanel.tsx`, `src/quiz/NumberPad.tsx`, `src/quiz/FeedbackOverlay.tsx`
**Depends on:** Phase 0 stubs of `Scheduler`, `CreatureSVG`, `AudioBus`
**Dev route:** `#/dev/quiz` — the quiz panel against the stub scheduler, no farm, no barn.

`QuizPanel` is a self-contained component that takes a `Scheduler` and a creature, runs *n* questions, and calls `onComplete` with a session log. It is embedded by the stall screen and by the paddock. It knows nothing about the world.

### Input: number pad, never multiple choice

Multiple choice lets her eliminate rather than recall. It trains the wrong skill and it inflates apparent mastery, so the dashboard will lie to you. Use a pad:

- Large tappable buttons, 0–9, backspace, and a big confirm button
- Physical keyboard as a parallel input path for laptop use
- **No auto-submit.** She confirms, so a mis-tap never counts as wrong.
- Typed digits shown large and friendly

### Measuring latency correctly

- **Start** the timer when the question's entrance animation completes, not when the component mounts.
- **Stop** it on the first digit entered for single-digit answers, and on confirm for multi-digit answers.

Otherwise you are measuring her typing speed and the whole engine is calibrated against noise.

### On a wrong answer

No penalty, no life lost, no visible streak reset. The creature looks briefly **puzzled — not sad, not disappointed**. Then:

1. Show the fact plainly: `7 × 8 = 56`
2. Show a dot-array or skip-count visual for one beat
3. She types the correct answer once to continue
4. The engine re-queues it three questions later

Shame reduces practice volume, and practice volume is the whole game.

### Track B acceptance tests

- A full run completes with keyboard only, and with touch only.
- Backspace works; confirm on an empty field does nothing.
- Reported latency for a scripted 2-second answer falls within 2000 ms ± 150 ms.
- The wrong-answer path cannot be skipped by tapping through.

---

## 6. Track C — Farmyard world

**Owns:** `src/world/Farmyard.tsx`, `src/world/tilemap.ts`, `src/world/pathfind.ts`, `src/world/Character.tsx`, `src/world/camera.ts`
**Depends on:** Phase 0 only
**Dev route:** `#/dev/farm` — the walkable farmyard with hotspots that log to console instead of changing screen.

### Dimensions

A 25 × 18 tile grid at 48 px, so 1200 × 864 total. Large enough to feel like a place, small enough that crossing it never takes more than about eight seconds. Long traversal is dead time in a five-minute session — resist the urge to make it bigger.

Camera follows the character with a dead zone in the middle third, clamped to the map bounds. On a viewport wider than the map, centre it and don't scroll.

### Movement: tap-to-move

She taps a tile; the character paths there and walks. A* over the walkability grid — about sixty lines, no library. Diagonal steps allowed only when both adjacent orthogonals are walkable, so she never clips a fence corner.

Speed roughly four tiles per second. Arrow keys and WASD as a secondary input for laptop play. Tapping mid-walk re-paths immediately rather than queuing.

**No d-pad, no virtual thumbstick.** On a touchscreen they are fiddly and she will hate them.

### Layout

Five hotspots, all reachable by path:

| Hotspot | Leads to |
| --- | --- |
| **Barn** | Barn interior — the main quiz venue |
| **Nest hollow** | Egg viewer, hatch ceremony |
| **Paddock** | Feeding Frenzy speed round |
| **Feed shed** | Pellet and coin totals — display only, earns nothing |
| **Farmhouse** | Day summary; parent dashboard behind a long-press |

Entering a hotspot means walking onto its tile, not tapping a button on it. Walking there is the transition.

### Track C acceptance tests

- A path is never computed through a fence, water, or building tile.
- Tapping an unreachable tile does nothing and does not throw.
- Re-tapping mid-walk changes course without a stutter.
- The camera never shows outside the map bounds.
- Sustains 60 fps on an iPad with all hotspots on screen.

---

## 7. Track D — Creatures, art, and the barn

**Owns:** `src/creatures/CreatureSVG.tsx`, `src/creatures/definitions.ts`, `src/creatures/animations.ts`, `src/barn/BarnInterior.tsx`, `src/barn/StallPanel.tsx`
**Depends on:** Phase 0 contracts; embeds Track B's `QuizPanel` by its stub
**Dev route:** `#/dev/creatures` — all twelve creatures in a grid, with buttons to trigger each mood.

### Art direction

**Soft-vector storybook, not pixel art.** A four-direction pixel walk cycle is a lot of frames and they will look bad without an artist. Rounded SVG shapes with flat fills, soft drop shadows, and a warm limited palette read as charming immediately and are pure text for the model to write.

The character is a round-headed figure with four facing variants and a bob-and-squash animation while translating. Tiles are SVG shapes, not textures.

### Creature generation

Twelve creatures, one per family, built procedurally from `CreatureParams`. A blob body with big eyes reads as genuinely cute the moment it squashes and bounces — **spend the effort on motion, not on detail.** Every creature needs five states: idle breathe, happy hop, eating chew, puzzled tilt, sleeping.

### Barn interior

Side-on screen view. Stalls along both walls, one creature per hatched family, empty stalls visible as future space. A creature with chores outstanding shows a soft indicator above its stall.

Tapping a stall opens `StallPanel`: the creature at rest, its name, a rename control, and a feed button that mounts `QuizPanel` for four or five questions.

**Design decision to hold:** the stall does **not** filter which facts are asked. The scheduler serves whatever is due across all families, and the creature simply presents it. Fictionally it's a little odd that the 7s creature asks 3×4 — she will not care, and interleaving matters more than tidy fiction. Do not build per-stall fact filtering.

### Track D acceptance tests

- All twelve creature parameter sets render without overlap or clipping at 200 px and at 64 px.
- Every mood transition is visually distinct.
- Renaming persists through a reload.
- An empty barn (no hatched creatures) renders sensibly rather than blank.

---

## 8. Track E — Persistence, audio, dashboard

**Owns:** `src/save/store.ts`, `src/audio/sounds.ts`, `src/parent/Dashboard.tsx`
**Depends on:** Phase 0 only
**Dev routes:** `#/dev/audio` (one button per sound), `#/dev/dashboard` (against generated fixture data)

### Persistence

A single versioned `localStorage` key. Write a `migrate()` function now, even at v1, and an export-to-JSON button. Losing her sanctuary to a cleared cache would be a genuine problem, not a minor bug.

Save on every graded answer, not on session end. Sessions get interrupted.

Do not persist character position — reset to the farmhouse door on load. Simpler, and it gives every session the same opening beat.

### Audio

All synthesized via Web Audio API, no files:

- `correct` — short rising two-note chime
- `fluent` — the chime plus a sparkle overtone, so **speed is audibly better than mere correctness**
- `wrong` — soft neutral low tone. Absolutely not a buzzer.
- `hatch` — ascending arpeggio
- `tap`, `footstep`, `doorOpen`, `chew` — small texture

Global mute, persisted, respected everywhere.

### Parent dashboard

Behind a long-press on the farmhouse sign plus a gate — a two-digit multiplication she can't yet do, or a four-digit PIN.

- 12×12 heatmap coloured by box level, each cell showing mean latency
- The ten slowest facts right now
- Questions answered and minutes practised per day, last 14 days
- Accuracy trend
- Export and reset

This is the instrument panel. It is how you find out whether any of this is working.

---

## 9. Phase 2 — Integration

Single agent, after tracks land. Replace stubs with real implementations and wire the screen graph:

```
farmyard ⇄ barn ⇄ stall
   ⇅
 nest, paddock, feedshed, farmhouse → summary
```

**Cold start.** She begins with one creature already in the barn — the anchor family (×1, ×2, ×10). Never open on an empty barn; there has to be something to care for on day one.

**Daily chores.** Once per calendar day, every stall has a hungry creature. Clearing all stalls is roughly twenty questions and constitutes the day's session. When the chores are done the game says goodnight rather than offering another round — **no "just one more" pressure.** She can start a free session whenever she wants, but the game never asks.

**Eggs.** A new egg appears in the nest hollow when its tier unlocks. Its visual state tracks `familyProgress()` — dull, glowing, cracked, hatching. Hatching triggers on the next visit to the nest after mastery, as a full-screen animated sequence, unskippable the first time only.

---

## 10. Phase 3 — Polish and ship

Sound pass, animation timing, transition feel, build, deploy to Vercel. Bookmark it on her iPad as a home-screen app so it opens without browser chrome.

---

## 11. Suggested evening plan

Sequential where it must be, parallel where it can be.

| Evening | Work |
| --- | --- |
| 1 | Phase 0, then Track A start to finish |
| 2 | Track B and Track E in parallel — **a playable quiz exists at the end of this evening** |
| 3 | Track C |
| 4 | Track D |
| 5 | Phase 2 integration, then Phase 3 |

**The risk worth naming out loud:** the farm is the fun part to build and it will happily consume every available evening while the scheduler sits half-tuned. The scheduler is the only component that actually teaches her anything. Protect evening 1, and don't let Track C start until Track A's tests are green.

---

## 12. Non-negotiable rules

Carry these verbatim into `CLAUDE.md`. Hold the line on all of them.

1. **No multiple choice, ever.**
2. **Exploration reveals; math advances.** No pellet, coin, or point of egg progress originates anywhere except a graded answer. No foraging, no idle income, no paying minigames.
3. **No punishment for absence.** Creatures never starve, sicken, run away, or look sad about being neglected. Guilt mechanics turn a game into an obligation and she will stop opening it.
4. **No social features, leaderboards, external links, ads, or purchases.**
5. **Latency drives promotion.** Correctness alone is never sufficient.
6. **Sessions end on time.** The game says goodnight; it never asks for one more round.
7. **Interleave families.** Never block-drill.
8. **All art and audio generated in code.** No downloaded assets, ever.

---

## 13. After it ships

Watch the dashboard for two weeks. The number that matters is not accuracy — it's the **latency distribution on the hard-core set**. If 7×8 is still averaging four seconds after two weeks of daily play, the scheduler isn't over-sampling it enough; raise the hard-core weight in Track A's step 2.

Then ask her what creature she wants next, and build that. It will be worth more than anything else on this list.
