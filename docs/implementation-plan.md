# Implementation plan

Phased. Each phase is an Epic on the board; each bullet becomes a small ticket.

> **2026-09-07 — reset.** The prototype was retired rather than refactored: the
> repo restarted from a clean pnpm monorepo on the architecture in
> `architecture.md`, porting only the learning engine, the save-store pattern
> and the sound recipes. Phase 1 below is therefore "build the core packages"
> rather than "extract from the prototype"; Phase 3 re-implements the screens
> from the PRD, not from old code.

## Phase 0 — Foundation & housekeeping  *(mostly done)*

Project rails so the rebuild is orderly.

- Notion board schema + views; agent access.
- GitHub repo + CI (typecheck / lint / test on PR) + branch protection.
- Firebase: two Hosting sites (game, landing) in the shared `student-games-be188`
  project, plus our own functions codebase and named Firestore database
  (`docs/deploy.md`).
- Docs: PRD, architecture, ADRs (this set).
- `CLAUDE.md`: Clean Architecture + Clean Code + coverage rules.
- Agent roster (`.claude/agents/`), skills (`.claude/skills/`), agent memory.
- LICENSE decision; README refresh.
- Landing page v0 (intention, status, future games).
- Decisions: license, package manager (pnpm), Node version, oldest supported
  device, domain name, asset pack, layout tooling.

## Phase 1 — Clean Architecture core  *(in progress)*

Build the valuable core first, on the new base, before any screens.

- Stand up the pnpm monorepo (`packages/*`, `apps/*`).
- `@sf/domain`: scheduler, curriculum model, mastery, economy — pure functions,
  no framework, injected RNG. Prototype tests ported; coverage ~90%+.
- `@sf/application`: use-cases + ports (`SaveStore`, `Clock`, `Rng`,
  `AudioBus`, `IdProvider`). Owns "one fact in flight at a time".
- `@sf/persistence`: `LocalSaveStore` (versioned key, never throws, fresh v3
  schema — prototype saves are not migrated).
- `@sf/audio`: `WebAudioBus` (the prototype's oscillator recipes).
- `apps/web`: a minimal React + r3f shell that consumes `@sf/application`
  only, with adapters wired in a composition root.
- Boundary rules (dependency-cruiser) enforcing the dependency direction.
- CI gate + Playwright e2e smoke green on the shell (boot → answer → coins).

## Phase 2 — 3D rendering foundation

- Spike: r3f scene + third-person character controller + idle↔walk crossfade
  (bought/Mixamo animation). Timebox; capture findings in an ADR.
- Decide + document: asset pack (Kenney / Synty / Quaternius), layout tooling
  (Blender export vs. Triplex vs. small in-app editor).
- Farm ground + camera rig (fixed-ish, Animal-Crossing feel).
- Character model + animation state logic (idle / walk / carry / pet / dance).
- Tap-to-move + navmesh/pathfinding in 3D; keyboard fallback.
- Performance budget: bundle size, cold-load time, target FPS; measured on the
  oldest supported device.

## Phase 3 — Alpha parity in 3D

Re-implement each prototype screen against `@sf/application`, in the 3D world.

- Farm hotspots + navigation (barn, feed shed, nest, paddock, training, zoo,
  farmhouse).
- Barn + stalls + the four care tasks + reactive care scenes.
- Nest + eggs + hatch ceremony + tap-to-practise-a-family.
- Paddock speed round (earns coins).
- Feed shed shop.
- Training ring (area model, ×10 anchor, doubling, near-square).
- Petting zoo (move animals barn↔zoo).
- HUD: coins, feed, per-animal health.
- Audio pass.
- Full e2e loop green in 3D.

## Phase 4 — Cloud save & identity (no PII)

- Firebase custom-auth Cloud Function (save code, and username + PIN).
- Firestore save schema + security rules (no PII; read-by-code only for visits).
- `FirestoreSaveStore` adapter; save / load / sync flows.
- Privacy notice page.
- Privacy-lawyer sanity check *(user)*.

## Phase 5 — Polish, landing & launch

- Landing page v1 (real copy, screenshots/clips, status).
- Deploy pipeline: PR previews + prod on merge (Firebase Hosting).
- PWA / add-to-home-screen; verified on mobile.
- Accessibility pass (contrast, keyboard, reduced-motion, font size).
- Playtest week with the daughter; triage feedback into tickets.
- A feedback channel for teachers (a form that writes to Firestore — no PII).

## Phase 6+ — Expansions (each its own Epic, prioritised later)

- Character creator (modular parts, colours).
- Fantasy animals (dragons, unicorns) as families / cosmetic hatch pool.
- Async multiplayer: visit a friend's farm by code (read-only, no chat).
- Math expansion: **Factors** (first proof that curriculum-as-data works).
- Further topics: fractions, arrays/area, division fact families, …
- Land + barn expansion.
