# Sanctuary Farm — agent handbook

A 2.5D farm game that teaches math fluency. Free, ad-free, PII-free, playable
from a link on any device.

**Read first:** `docs/PRD.md` · `docs/architecture.md` · `docs/implementation-plan.md`
· `docs/adr/`. History of the prototype: `docs/redesign-notes.md`, `docs/original-spec.md`.

Those prose docs are **mirrored to Notion** — that's where humans read them; the
markdown here is the authoring surface, changed via PR and pushed with the
`notion-docs` skill (`docs/README.md` has the links). This file, `CLAUDE.md`, is
the exception — it stays repo-only.

> Status: rebuilt from scratch on 2026-09-07. The prototype is gone (git history
> has it); the repo is the pnpm monorepo described below. Phase 1 (the core
> packages + a minimal `apps/web` shell) is in progress; the game screens come
> in Phase 3 against `@sf/application`.

## Stack

- **The game is moving to Godot 4.7 (GDScript) in `game/` — ADR-0006.** Same
  layers as folders (`domain/`, `app/`, `adapters/`, `scenes/`), GUT tests,
  `pnpm godot:*` scripts; start at `game/README.md`. James builds the scenes in
  the editor; agents own rules, saves, tests, CI. Until SF-96 retires it, the
  web client below still builds and `pnpm gate` stays green.
- TypeScript (strict) · React 19 · **react-three-fiber / Three.js** for the world ·
  Tailwind for 2D UI · Vitest · Playwright for e2e.
- **pnpm** workspaces. Node pinned in `.nvmrc` + `engines`.
- Firebase: Hosting (game + landing), custom Auth, Firestore, Cloud Functions.
- Deploy: Firebase Hosting. PR previews + prod on merge.
- **We share the Firebase project `student-games-be188` with two other games.**
  Own Hosting sites (`sanctuary-farm`, `sanctuary-farm-landing`), own functions
  codebase (`sanctuary-farm`), own named Firestore database (`sanctuary-farm`).
  Deploy only with the scoped `pnpm deploy:*` scripts — a bare `firebase deploy`,
  the `default` codebase, or rules on `(default)` would break another game.
  Emulators run on `demo-sanctuary-farm`. Read `docs/deploy.md` before touching
  `firebase.json` or `.firebaserc`.

## Architecture — the rule that matters

**Dependencies point inward.** `domain` → nothing. `application` → `domain`.
`infrastructure` → `application` + `domain`. `presentation` → `application` (and
`domain` *types* only).

- **`packages/domain`** — pure rules: the scheduler (Leitner + latency +
  interleave + tiers), curriculum, mastery. No framework, no I/O, no
  `Date.now()`, no `Math.random()` — inject a `Clock` and an `Rng`.
- **`packages/application`** — use-cases + ports (`SaveStore`, `Clock`, `Rng`,
  `AudioBus`; `IdProvider` arrives in Phase 4). Returns plain data / events.
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

## Commands (pnpm workspace, run from the repo root)

| Command | What |
| --- | --- |
| `pnpm install` | once per checkout |
| `pnpm dev` | Vite dev server for `apps/web` |
| `pnpm gate` | typecheck · lint (oxlint) · boundaries (dependency-cruiser) · tests + coverage · build · size (size-limit) — must be green before hand-off |
| `pnpm typecheck` / `pnpm lint` / `pnpm boundaries` / `pnpm test` / `pnpm build` / `pnpm size` | the gate's parts |
| `pnpm size` | the JS/CSS budgets in `docs/performance-budget.md`, over `apps/web/dist` (needs a build first) |
| `pnpm test:coverage` | tests with the domain ≥ 90% line threshold enforced |
| `pnpm e2e` | Playwright smoke against `apps/web` (first: `pnpm --filter @sf/web exec playwright install chromium`). Each run builds and serves on free ports of its own and never reuses a server, so worktrees can run it side by side |
| `UPDATE_DOC_IMAGES=1 pnpm e2e` | same, and refresh the tracked screenshots in `docs/img/` (a normal run writes them only under `apps/web/test-results/`) |
| `E2E_REUSE_SERVER=1 pnpm e2e` | run against servers you already started on the fixed ports — `vite preview` :4173, `pnpm dev --port 5174`, landing :4180 (Playwright starts any that are not up). Pin a single port with `E2E_WEB_PREVIEW_PORT` / `E2E_WEB_DEV_PORT` / `E2E_LANDING_PORT` |
| `pnpm vitest run --project domain` | one package's tests (`domain` · `application` · `persistence` · `audio` · `web`) |
| `pnpm emulators` / `pnpm test:rules` | Firebase emulators / Firestore rules tests, both pinned to `demo-sanctuary-farm` (needs a JDK) |
| `pnpm test:auth` | sign-in functions (SF-113) against the Functions + Firestore + Auth emulators on `demo-sanctuary-farm` (needs a JDK; `docs/sign-in.md`) |
| `pnpm deploy:game` · `:landing` · `:functions` · `:rules` | the only sanctioned deploys — see `docs/deploy.md` |
| `pnpm godot:import` · `godot:test` · `godot:export:web` · `godot:e2e:web` · `godot:gate` | the Godot client (`game/`): headless import, layer check + GUT, web export to `game/build/web`, Playwright smoke on it; `GODOT_BIN` overrides the macOS Godot path |

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

Ticket (a GitHub issue on the "Sanctuary Farm Project" board) → `architect` refines & sizes → dev implements on a branch
with tests → `qa` verifies (incl. e2e / screenshots) → `reviewer` checks against
this file → human merges. Move the ticket across the board as you go (skill:
`github-board`, via the `gh` CLI).

Branch names: `feat/SF-123-short-slug`, `fix/…`, `chore/…`. One ticket per PR.
PR description says `Closes #<issue>` and states what changed + how it was verified.

`CONTRIBUTING.md` states this same workflow for humans outside the agent fleet;
`CODE_OF_CONDUCT.md` covers conduct and the kid-safety reporting address. Keep
all three in step when the workflow changes.

## Agents & skills

`.claude/agents/`: `architect`, `domain-dev`, `app-dev`, `qa`, `reviewer`,
`devops`. Pick by the layer/task. Full briefs in each file.

`.claude/skills/`: `write-ticket` (ticket shape), `github-board` (read/create/move
tickets), `feature-workflow` (branch → gate → PR → merge), `adr` (record a
decision), `notion-docs` (push a changed doc to Notion). The board is GitHub Issues +
the "Sanctuary Farm Project" GitHub Project, worked with `gh` (`docs/board.md`
has the mapping and commands; it moved from Notion on 2026-10-04 —
`docs/notion-migration.md` maps old `SF-n` to issues). The prose docs are
mirrored to Notion through the **Notion MCP connector**.

## Memory

Shared, durable knowledge lives in `docs/` — product intent in `docs/PRD.md`,
architecture in `docs/architecture.md`, expensive-to-reverse decisions in
`docs/adr/` (skill: `adr`). Agent-to-agent notes and gotchas go in
`.claude/memory/` (one markdown file per topic, `MEMORY.md` is the index). Read
the index at task start; append a note when you learn something the next agent
will need. Don't put transient task state there.
