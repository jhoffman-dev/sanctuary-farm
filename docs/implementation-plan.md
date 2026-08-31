# Implementation plan

Phased. Each phase is an Epic on the board; each bullet becomes a small ticket.
Ship the current prototype as the alpha *now* and gather feedback while Phase 1–3
happen behind it.

## Phase 0 — Foundation & housekeeping  *(in progress)*

Project rails so the rebuild is orderly.

- Notion board schema + views; agent access.
- GitHub repo + CI (typecheck / lint / test on PR) + branch protection.
- Firebase project + Hosting (two sites: game, landing).
- Docs: PRD, architecture, ADRs (this set).
- `CLAUDE.md`: Clean Architecture + Clean Code + coverage rules.
- Agent roster (`.claude/agents/`), skills (`.claude/skills/`), agent memory.
- LICENSE decision; README refresh.
- Landing page v0 (intention, status, future games).
- Decisions: license, package manager (pnpm), Node version, oldest supported
  device, domain name, asset pack, layout tooling.

## Phase 1 — Clean Architecture refactor

Extract the valuable core before building on it.

- Stand up the pnpm monorepo (`packages/*`, `apps/*`).
- Extract `@sf/domain`: scheduler, curriculum model, mastery — pure, no framework,
  injected clock + RNG. Port existing tests; push coverage to ~90%+.
- Define `@sf/application`: use-cases + ports (`SaveStore`, `Clock`, `Rng`,
  `AudioBus`, `IdProvider`).
- `@sf/persistence`: `LocalSaveStore` (migrate the current localStorage store).
- `@sf/audio`: `WebAudioBus` (migrate current sounds).
- Rewire `apps/web` to consume `@sf/application` only. Delete rules from the UI.
- Lint boundary rules enforcing the dependency direction.
- e2e smoke suite green against the refactored 2D app (parity checkpoint).

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
