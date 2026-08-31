# Sanctuary Farm — agent handbook

A 2.5D farm game that teaches math fluency. Free, ad-free, PII-free, playable
from a link on any device.

**Read first:** `docs/PRD.md` · `docs/architecture.md` · `docs/implementation-plan.md`
· `docs/adr/`. History of the prototype: `docs/redesign-notes.md`, `docs/original-spec.md`.

Those prose docs are **mirrored to Notion** — that's where humans read them; the
markdown here is the authoring surface, changed via PR and pushed with the
`notion-docs` skill (`docs/README.md` has the links). This file, `CLAUDE.md`, is
the exception — it stays repo-only.

> Status: the prototype in `src/` is the current alpha. The rebuild (monorepo,
> Clean Architecture, react-three-fiber) is Phase 1+. Until Phase 1 lands, `src/`
> is the app; after, it moves under `apps/web` and `packages/*`.

## Stack

- TypeScript (strict) · React 19 · **react-three-fiber / Three.js** for the world ·
  Tailwind for 2D UI · Vitest · Playwright for e2e.
- **pnpm** workspaces. Node pinned in `.nvmrc` + `engines`.
- Firebase: Hosting (game + landing), custom Auth, Firestore, Cloud Functions.
- Deploy: Firebase Hosting. PR previews + prod on merge.

## Architecture — the rule that matters

**Dependencies point inward.** `domain` → nothing. `application` → `domain`.
`infrastructure` → `application` + `domain`. `presentation` → `application` (and
`domain` *types* only).

- **`packages/domain`** — pure rules: the scheduler (Leitner + latency +
  interleave + tiers), curriculum, mastery. No framework, no I/O, no
  `Date.now()`, no `Math.random()` — inject a `Clock` and an `Rng`.
- **`packages/application`** — use-cases + ports (`SaveStore`, `Clock`, `Rng`,
  `AudioBus`, `IdProvider`). Returns plain data / events.
- **`packages/persistence`, `packages/audio`, `functions/`** — adapters. Thin.
- **`apps/web`** — React + r3f. **Holds zero game rules.** If a component is
  deciding what fact comes next, it's in the wrong layer.

Full detail + the monorepo layout: `docs/architecture.md`.

## Clean Code — enforced in review

- Names say *what*, not *how*. No `data` / `info` / `manager` / `helper` as a
  whole name.
- One thing per function; prefer < ~30 lines; > 3 params → pass an object.
- Comments explain *why* or a non-obvious constraint — never restate the code.
- No dead code, no commented-out code. No `any` without a one-line reason.
- Errors are handled or propagated on purpose — never swallowed.
- One reason to change per module. Rules + rendering + I/O in one file → split.
- Cross-package imports go through the package's public entry only.

## Testing — required to merge

| Layer | Kind | Bar |
| --- | --- | --- |
| domain | unit, pure, seeded RNG + fixed clock | ~90%+ lines; every rule tested |
| application | unit, fake adapters | every use-case, happy + key edges |
| infrastructure | integration | round-trip + failure modes |
| presentation | component + e2e smokes | key flows render; day-one loop e2e-green |

No snapshot test as a stand-in for a behaviour test.

## Commands (current prototype; will move to pnpm scripts in Phase 1)

| Command | What |
| --- | --- |
| `npm run dev` | Vite dev server (game at `/`, dev routes at `?dev=1`) |
| `npm run typecheck` / `npm run lint` / `npm test` / `npm run build` | must all pass before hand-off |
| `npm run smoke` | Playwright walkthrough → screenshots in `../Debugging Images/` |

Node is Homebrew-installed — prefix bash calls with `export PATH="/opt/homebrew/bin:$PATH"`.

## Game design — hold the line

1. **No multiple choice, ever.** A number pad only.
2. **Math advances; exploration reveals.** Coins/feed/egg progress come only from
   graded answers — and coins only in the paddock and nest.
3. **Latency drives mastery.** Correctness alone is never enough.
4. **Sessions end on time.** The game says goodnight; it never begs.
5. **Interleave.** Never block-drill; never a family 3× in a row.
6. **No punishment framing.** Animals get glum, never starve / sicken / leave.
7. **No ads, no purchases, no PII.** (ADR-0002.) Any social feature is
   pick-from-phrases, never free text kids see.
8. **Accessible.** Colour-blind-safe, keyboard-playable, respects reduced-motion,
   readable at small sizes.

Superseded from the prototype era: art is now bought/authored assets (one
coherent pack), there is a backend, "beat your own best" in the paddock is fine.

## Workflow

Ticket (Notion board) → `architect` refines & sizes → dev implements on a branch
with tests → `qa` verifies (incl. e2e / screenshots) → `reviewer` checks against
this file → human merges. Move the ticket across the board as you go (skill:
`notion-board`).

Branch names: `feat/SF-123-short-slug`, `fix/…`, `chore/…`. One ticket per PR.
PR description links the ticket and states what changed + how it was verified.

## Agents & skills

`.claude/agents/`: `architect`, `domain-dev`, `app-dev`, `qa`, `reviewer`,
`devops`. Pick by the layer/task. Full briefs in each file.

`.claude/skills/`: `write-ticket` (ticket shape), `notion-board` (move tickets on
the board), `feature-workflow` (branch → gate → PR → merge), `adr` (record a
decision), `notion-docs` (push a changed doc to Notion). The board and docs live
in Notion — `docs/board.md`.

## Memory

Shared, durable knowledge lives in `docs/` — product intent in `docs/PRD.md`,
architecture in `docs/architecture.md`, expensive-to-reverse decisions in
`docs/adr/` (skill: `adr`). Agent-to-agent notes and gotchas go in
`.claude/memory/` (one markdown file per topic, `MEMORY.md` is the index). Read
the index at task start; append a note when you learn something the next agent
will need. Don't put transient task state there.
