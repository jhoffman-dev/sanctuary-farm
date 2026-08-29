# Sanctuary Farm — working notes for agents

A multiplication-fluency game for a 10-year-old, built as a browser app.
Full spec: `docs/SPEC.md`. Contracts appendix: `docs/CONTRACTS.md`.
Orchestration + per-track briefs: `docs/AGENTS.md`, `docs/tracks/`.

## Commands

| Command | What |
| --- | --- |
| `npm run dev` | Vite dev server. Renders the **dev-route index** (`src/dev/DevRoutes.tsx`). Add `?app=1` to boot the real game shell (`src/App.tsx`). |
| `npm run typecheck` | `tsc -b --noEmit`. Must be clean before you hand off. |
| `npm test` | Vitest, single run. |
| `npm run test:watch` | Vitest watch. |
| `npm run lint` | oxlint. Must be clean. |
| `npm run build` | `tsc -b && vite build`. Must succeed before you hand off. |

Node ≥ 20 (developed on 26). Package manager: **npm** (a `package-lock.json` is committed).

## Stack (as built — supersedes the spec's "React 18" line)

- Vite 8 + React 19 + TypeScript (strict) — path alias `@/*` → `src/*`
- Tailwind CSS 4 via `@tailwindcss/vite` (`@import "tailwindcss"` in `src/index.css`, no config file)
- `motion` (Framer Motion v13) — UI transitions and creature idle animation only
- A plain `requestAnimationFrame` loop for character movement (not `motion`)
- Inline SVG for **all** art. No image files, no sprite sheets, no external assets.
- Web Audio API for sound, oscillator-synthesized. No audio files.
- `localStorage` for persistence. No backend, no accounts, no network calls at runtime.
- Deploy: Vercel static build.

**Do not add** a game engine, a state-management library, a UI component library, or a
pathfinding package. Everything here is small enough to write directly.

## How the parallel build is organised

- `src/contracts/` — every shared type + `constants.ts` (all tuning numbers) + `rng.ts`
  (seedable RNG). **Frozen.** Import from `@/contracts`. If you think a contract is wrong,
  stop and flag it — do not edit it unilaterally.
- Every cross-track module exists as a `// STUB` at its real path. **You replace only your
  own track's stubs** (see `docs/AGENTS.md` for the ownership table). Never edit another
  track's files.
- Dev routes: each track owns exactly one file `src/dev/routes/<name>.route.tsx` that
  `export default`s a `DevRoute`. They are picked up by a glob — **no shared registry file
  to edit**, so no collisions.
- `src/engine/facts.ts` is a Phase 0 reference implementation (shared infra). Track A owns
  further changes but must keep `buildFacts` / `ALL_FACTS` stable.

## Non-negotiable rules — hold the line on all of them

1. **No multiple choice, ever.** A number pad only. Multiple choice trains elimination, not recall.
2. **Exploration reveals; math advances.** No pellet, coin, or point of egg progress originates
   anywhere except a graded answer. No foraging, no idle income, no paying minigames.
3. **No punishment for absence.** Creatures never starve, sicken, run away, or look sad about
   neglect. Guilt mechanics turn a game into an obligation.
4. **No social features, leaderboards, external links, ads, or purchases.**
5. **Latency drives promotion.** Correctness alone is never sufficient (see the grading table).
6. **Sessions end on time.** The game says goodnight; it never asks for one more round.
7. **Interleave families.** Never block-drill. Never the same family more than twice in a row.
8. **All art and audio generated in code.** No downloaded assets, ever.

## What success looks like

She answers any fact from 1×1 to 12×12 correctly in **under three seconds**, without visible
computation. Everything else exists to make her want to open the game tomorrow.
