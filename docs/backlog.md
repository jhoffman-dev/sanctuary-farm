# Starter backlog

Generated from `scripts/notion/gen-backlog.mjs` (source of truth) into this file and
`docs/backlog.csv` (import with the `notion-board` skill). Ticket shape: see the
`write-ticket` skill. Keys (SF-N) are assigned by Notion on import.

**Legend** — Status: Backlog / Ready / In progress / In review / Blocked / Done ·
Assignee: _blank_ = any agent, **James** = needs a human ·
Size: XS / S / M · Priority: P0 (now) / P1 / P2.

## At a glance

| | Count |
| --- | --- |
| Epics | 7 |
| Tickets total | 63 |
| Done | 15 |
| Ready | 22 |
| Assigned to James | 13 |

## Phase 0 — Project foundation

_P0 · agents_ — Housekeeping before feature work: docs, agents, skills, board, toolchain, CI/CD scaffolding, landing page. Done when a dev agent can pick a Ready ticket and ship it through CI to a preview deploy.

| Type | Title | Status | Assignee | Size | Pri |
| --- | --- | --- | --- | --- | --- |
| Task | Install gh / firebase-tools / pnpm CLIs | Done | — | XS | P0 |
| Task | Write the PRD | Done | — | S | P0 |
| Task | Write the architecture spec | Done | — | S | P0 |
| Task | Write the implementation plan | Done | — | S | P0 |
| Task | Rewrite CLAUDE.md for architecture / clean code / testing | Done | — | S | P0 |
| Task | ADR-0001 — stack choice | Done | — | S | P0 |
| Task | ADR-0002 — identity and save | Done | — | S | P0 |
| Task | Write the six agent definitions | Done | — | S | P0 |
| Task | Write the core skills | Done | — | S | P0 |
| Task | Set up the agent memory convention | Done | — | XS | P0 |
| Task | Notion board schema spec + CLI | Done | — | S | P0 |
| Task | Docs-to-Notion sync script | Done | — | S | P0 |
| Task | Landing page v0 (static) | Done | — | S | P0 |
| Task | Refresh the README | Done | — | XS | P0 |
| Task | gitignore for secrets and monorepo | Done | — | XS | P0 |
| Task | GitHub: auth and create the repo | Ready | James | XS | P0 |
| Task | Decide repository visibility (public vs private) | Ready | James | XS | P0 |
| Task | Choose a license and add LICENSE | Ready | James | XS | P0 |
| Task | Notion: create integration, share DB + a Docs page, add credentials | Ready | James | XS | P0 |
| Task | Notion: build the board and import the backlog | Ready | — | S | P0 |
| Task | Notion: push the docs and verify the sync | Ready | — | S | P0 |
| Task | Firebase: auth and create the project | Ready | James | S | P0 |
| Task | Decide GitHub Project vs Notion-only board | Ready | James | XS | P0 |
| Task | Decide analytics stance | Ready | James | XS | P0 |
| Task | Decide error monitoring | Ready | James | XS | P0 |
| Task | Decide a domain name | Backlog | James | XS | P1 |
| Task | Provide a low-end test device for QA | Backlog | James | XS | P1 |
| Task | Privacy notice legal sanity-check | Backlog | James | S | P2 |
| Task | pnpm workspace skeleton | Ready | — | S | P0 |
| Task | ESLint import-boundary rules | Ready | — | S | P0 |
| Task | Pin Node and editor config | Ready | — | XS | P0 |
| Task | GitHub Actions CI workflow | Backlog | — | S | P0 |
| Task | GitHub branch protection on main | Backlog | James | XS | P0 |
| Task | firebase.json and emulator config | Backlog | — | S | P1 |
| Task | PR preview deploy workflow | Backlog | — | S | P1 |
| Task | Secrets management doc for agents | Ready | — | XS | P0 |
| Task | Issue and PR templates | Ready | — | XS | P1 |
| Task | Dependency update config | Ready | — | XS | P1 |
| Task | CONTRIBUTING and CODE_OF_CONDUCT | Backlog | — | XS | P2 |
| Task | Definition of Done doc | Ready | — | XS | P0 |
| Task | Curriculum design doc | Ready | — | M | P1 |
| Task | Accessibility standard doc | Ready | — | S | P1 |
| Task | Performance budget doc | Ready | — | S | P1 |
| Task | Kid-safety threat model | Ready | — | S | P1 |
| Task | Art direction / style guide doc | Backlog | — | S | P1 |
| Task | Sound design approach doc | Backlog | — | XS | P2 |
| Task | Privacy notice draft | Ready | — | S | P1 |
| Task | Firestore backup strategy doc | Backlog | — | XS | P2 |
| Task | Landing: favicon, social meta, OG image | Backlog | — | XS | P2 |
| Task | Landing: verify in browser and deploy | Backlog | — | XS | P2 |

**Install gh / firebase-tools / pnpm CLIs** — Local toolchain. Installed gh 2.98, firebase-tools 15.28, pnpm 11.24.

**Write the PRD** — docs/PRD.md — one line, why, who, principles, core loop, alpha definition, success signals, non-goals.

**Write the architecture spec** — docs/architecture.md — Clean Architecture layers, the dependency rule per layer, monorepo layout, testing strategy, clean-code standards.

**Write the implementation plan** — docs/implementation-plan.md — phases 0 through 6.

**Rewrite CLAUDE.md for architecture / clean code / testing** — Requires Clean Architecture (the dependency rule), Clean Code (enforced in review), and a per-layer test bar (required to merge).

**ADR-0001 — stack choice** — Records TS / React / react-three-fiber over Unity / Godot / Flutter. Status Proposed — needs James to accept.

**ADR-0002 — identity and save** — No-PII identity: save codes, optional auto-generated username + PIN. Status Proposed — needs James to accept; privacy sanity-check pending.

**Write the six agent definitions** — .claude/agents/: architect, domain-dev, app-dev, qa, reviewer, devops.

**Write the core skills** — .claude/skills/: write-ticket, notion-board (+ notion.mjs CLI), adr, feature-workflow.

**Set up the agent memory convention** — .claude/memory/ — MEMORY.md index plus one file per topic. Agents read at task start, append what the next agent needs.

**Notion board schema spec + CLI** — docs/board.md (schema, views, setup, flow) and .claude/skills/notion-board/notion.mjs.

**Docs-to-Notion sync script** — scripts/notion/sync-docs.mjs + lib.mjs — markdown docs are authored in the repo and pushed to Notion pages (Notion is where they are read). Manifest at scripts/notion/docs-manifest.json; index at docs/README.md. Needs a smoke test once the token lands.

**Landing page v0 (static)** — apps/landing/ — static HTML/CSS: mission, current status checklist, future-games section. No build.

**Refresh the README** — GitHub-ready: what it is, doc index, run instructions, agents/skills, non-negotiables.

**gitignore for secrets and monorepo** — Stop ignoring all of .claude/; ignore only local state and secrets; add Firebase / env patterns.

**GitHub: auth and create the repo** — Interactive. gh auth login; decide visibility (see that ticket); gh repo create sanctuary-farm --source=. --push; set default branch to main. Unblocks CI.

**Decide repository visibility (public vs private)** — Public fits free-forever and lets teachers/devs see it, but needs LICENSE + CODE_OF_CONDUCT and a clean history. Private is safe until launch. Recommendation: private now, public at Phase 5. Record the call.

**Choose a license and add LICENSE** — Recommendation: AGPL-3.0 — keeps derivatives open, blocks a closed commercial fork, matches free-forever. MIT for maximum reuse. Add LICENSE + a README line.

**Notion: create integration, share DB + a Docs page, add credentials** — Follow docs/board.md Setup: internal integration; share "Sanctuary Farm DB" AND a new empty page (e.g. "Sanctuary Farm — Docs") with it; put token + dbId + docsRootPageId in .claude/notion.local.json; run notion.mjs schema.

**Notion: build the board and import the backlog** — After the token is in .claude/notion.local.json: run notion.mjs setup (creates properties), add the "ID" property + the four views in the UI as it instructs, then notion.mjs import docs/backlog.csv. AC: the board shows every backlog ticket with Type/Status/Phase/Epic set.

**Notion: push the docs and verify the sync** — After the token + the Docs page exist: run node scripts/notion/sync-docs.mjs, open each created page, confirm headings / tables / code render acceptably, commit the manifest with its page ids and the updated docs/README.md. Fix mdToBlocks in scripts/notion/lib.mjs for anything mangled. AC: every manifest doc has a working Notion link.

**Firebase: auth and create the project** — Interactive. firebase login; create a project; pick a project id (e.g. sanctuary-farm-app); add two Hosting sites (game, landing); enable Firestore + Functions. Hand the project id back.

**Decide GitHub Project vs Notion-only board** — Dual boards mean double bookkeeping. Recommendation: Notion is the single board; GitHub only for code + PRs + Actions. Record the call.

**Decide analytics stance** — No per-user analytics (ADR-0002). Option: privacy-preserving aggregate counts with no identifiers. Recommendation: none for alpha. Record the call in a note or ADR.

**Decide error monitoring** — Recommendation: none for alpha; if later, Sentry with PII scrubbing and no session replay. Record the call.

**Decide a domain name** — Optional for alpha — *.web.app works. If you want a real domain, register it and note it here for the Hosting custom-domain step.

**Provide a low-end test device for QA** — A Chromebook, old iPad, or similar. QA needs it to check the link-reachable / any-device principle before the alpha.

**Privacy notice legal sanity-check** — Before the public alpha: have someone who knows COPPA/FERPA read docs/privacy.md and ADR-0002. Blocking for Phase 5, not now.

**pnpm workspace skeleton** — pnpm-workspace.yaml, root package.json with -w scripts, packages/config with shared tsconfig / eslint / vitest presets. AC: pnpm -w typecheck runs; gate green.

**ESLint import-boundary rules** — Encode the dependency rule as eslint import restrictions. AC: a deliberate cross-layer import fails lint; tests: a fixture that must fail.

**Pin Node and editor config** — .nvmrc, engines, .editorconfig, prettier config aligned with oxlint. AC: node -v matches .nvmrc; gate green.

**GitHub Actions CI workflow** — On PR: install (cache pnpm), typecheck, lint, unit, build, e2e smoke. Block merge on red. Blocked on the repo existing. AC: a trivial PR shows all checks.

**GitHub branch protection on main** — After CI exists: require CI checks + one review before merge to main; no direct pushes.

**firebase.json and emulator config** — firebase.json (two hosting targets: game, landing), .firebaserc, Firestore rules + indexes stubs, functions/ scaffold, emulator config. Blocked on the Firebase project. AC: firebase emulators:start boots.

**PR preview deploy workflow** — Action: Firebase Hosting preview channel per PR, prod on merge to main. Needs a Firebase CI token in GH secrets (James). Blocked on firebase.json.

**Secrets management doc for agents** — docs/secrets.md — what secrets exist, where each lives, and the rule: never commit one, never put one in client code.

**Issue and PR templates** — .github/ISSUE_TEMPLATE + pull_request_template.md (linked ticket, what changed, how verified). AC: templates appear on GitHub.

**Dependency update config** — Dependabot or Renovate for npm + Actions, weekly, grouped. AC: config committed; first PR opens once on GitHub.

**CONTRIBUTING and CODE_OF_CONDUCT** — Only if the repo goes public. CONTRIBUTING points at CLAUDE.md + the board; Contributor Covenant. Blocked on the visibility decision.

**Definition of Done doc** — docs/definition-of-done.md — the checklist a ticket must meet. Referenced by qa and reviewer.

**Curriculum design doc** — docs/curriculum.md — alpha math scope (multiplication 0–12) and planned expansions, each mapped to Common Core, with fact ordering + introduction tiers. AC: reviewed by James.

**Accessibility standard doc** — docs/accessibility.md — target WCAG 2.2 AA plus game-specific rules (number-pad only, colour-blind-safe, keyboard-playable, reduced-motion, min font sizes, HUD labels). A checklist qa can run.

**Performance budget doc** — docs/performance-budget.md — targets for a low-end Chromebook: JS/asset transfer, TTI, sustained FPS, max triangles + texture memory, max draw calls. Feeds Phase 2.

**Kid-safety threat model** — docs/threat-model.md — what could harm a child user or leak data (free-text surfaces, username guessing, save-code sharing, Firestore rule gaps, third-party scripts, deploy of secrets), with a mitigation per item.

**Art direction / style guide doc** — docs/art-direction.md — the look: 2.5D, warm, readable silhouettes, palette, which one asset pack. Partly blocked on the asset-pack ADR.

**Sound design approach doc** — docs/sound-design.md — synth vs sampled, the correct-answer feedback sound, ambient bed, mute-by-default question, no punishing failure sounds.

**Privacy notice draft** — docs/privacy.md — plain-language, two short versions (kid-readable and parent/teacher): what is and is not collected, what a save code / username is, how to delete. Feeds the legal sanity-check.

**Firestore backup strategy doc** — docs/firestore-backup.md — scheduled export to a bucket, retention, restore steps. Implement in Phase 4.

**Landing: favicon, social meta, OG image** — apps/landing/ — favicon, description/OG/Twitter meta, a simple 1200x630 share image. AC: link preview renders.

**Landing: verify in browser and deploy** — Run the landing page in a real browser, screenshot desktop + mobile, check contrast + keyboard focus, then deploy to the landing Hosting site. Blocked on firebase.json.

## Phase 1 — Clean Architecture refactor

_P0 · agents_ — Move the prototype into a pnpm monorepo. Extract pure game logic into @sf/domain and @sf/application behind ports. apps/web becomes a thin presentation layer. See docs/architecture.md.

| Type | Title | Status | Assignee | Size | Pri |
| --- | --- | --- | --- | --- | --- |
| Story | Extract @sf/domain from the prototype | Backlog | — | M | P0 |
| Story | Define @sf/application use-cases and ports | Backlog | — | M | P0 |
| Task | Move the prototype under apps/web | Backlog | — | S | P1 |
| Task | localStorage SaveStore adapter | Backlog | — | S | P1 |
| Task | Web Audio AudioBus adapter | Backlog | — | S | P2 |

**Extract @sf/domain from the prototype** — Move the scheduler, curriculum, mastery, latency grading into packages/domain as pure functions. Inject Clock + Rng ports. No React, no localStorage, no Date.now/Math.random. AC: domain unit tests ~90%+; prototype still runs via an adapter; gate green.

**Define @sf/application use-cases and ports** — Use-cases (next question, grade answer, run chores, hatch egg, care task, goodnight) and ports (SaveStore, Clock, Rng, AudioBus, IdProvider). AC: every use-case covered with fake adapters; apps/web calls only these.

**Move the prototype under apps/web** — Relocate src/ to apps/web/src, wire the workspace, keep tests green. AC: pnpm -w test green; app runs.

**localStorage SaveStore adapter** — packages/persistence — implement SaveStore over the existing versioned localStorage key incl. the v2 migration. AC: round-trip + migration integration tests.

**Web Audio AudioBus adapter** — packages/audio — implement AudioBus over the existing Web Audio synth. AC: adapter tested; presentation no longer imports audio internals.

## Phase 2 — 3D rendering foundation

_P1 · agents_ — react-three-fiber world: camera, lighting, a controllable animated keeper, tap-to-move, one coherent asset pack, performance budget. See docs/implementation-plan.md.

| Type | Title | Status | Assignee | Size | Pri |
| --- | --- | --- | --- | --- | --- |
| Task | Spike: r3f character controller | Backlog | — | S | P0 |
| Task | Spike: asset pack decision | Backlog | — | S | P0 |
| Task | Spike: world layout tooling decision | Backlog | — | S | P1 |

**Spike: r3f character controller** — Timebox 1 day. Load a rigged glTF, play idle/walk from Mixamo, crossfade on velocity, tap-to-move on a ground plane, isometric-ish camera. AC: findings + recommendation in docs/adr/000N-3d-foundation.md; throwaway branch.

**Spike: asset pack decision** — Timebox. Compare Kenney (CC0) vs Quaternius (CC0) vs Synty POLYGON (paid) for a coherent farm set with riggable animals + a humanoid keeper. AC: an ADR with the pick, cost, licence terms.

**Spike: world layout tooling decision** — Timebox. How James lays out the farm without hand-editing coordinates — Blender, Tiled, or a small in-app editor. AC: ADR with the pick and why.

## Phase 3 — Alpha parity in 3D

_P1 · agents_ — Re-implement every prototype screen against @sf/application in the 3D shell: farmyard, barn, nest, paddock, feed shed, petting zoo, training ring, HUD, summary.

| Type | Title | Status | Assignee | Size | Pri |
| --- | --- | --- | --- | --- | --- |

## Phase 4 — Cloud save and identity

_P2 · agents_ — No-PII cloud save: save codes plus optional auto-generated username + PIN via a Firebase custom-auth Cloud Function. Firestore schema + rules. See ADR-0002.

| Type | Title | Status | Assignee | Size | Pri |
| --- | --- | --- | --- | --- | --- |

## Phase 5 — Polish and launch

_P2 · agents_ — Landing v1, deploy pipeline, PWA, accessibility pass, playtest with the target user, teacher feedback form, public alpha link.

| Type | Title | Status | Assignee | Size | Pri |
| --- | --- | --- | --- | --- | --- |
| Story | Landing v1 | Backlog | — | M | P2 |
| Story | Teacher feedback form | Backlog | — | S | P2 |
| Story | PWA / add-to-home-screen | Backlog | — | S | P2 |
| Story | Accessibility pass | Backlog | — | M | P1 |
| Story | Playtest with the target user | Backlog | James | S | P1 |

**Landing v1** — Upgrade apps/landing from v0: real screenshots/video of the alpha, the public play link, the feedback form link, teacher note. AC: verified in browser, deployed, link previews work.

**Teacher feedback form** — A way for a teacher or student to send feedback with no student data collected (no email required; free text from adults only, never shown to kids). AC: submissions land somewhere James can read; threat-model checked.

**PWA / add-to-home-screen** — Manifest + icons + offline shell so the game opens full-screen from a home-screen icon on iPad/Chromebook. AC: installs and launches on the test device.

**Accessibility pass** — Run the docs/accessibility.md checklist end to end. AC: every item passes or has a filed follow-up.

**Playtest with the target user** — Sit with Sophie through a full session on the test device. Note every confusion and drop-off. File each as a Bug or Story. AC: notes captured, tickets filed.

## Phase 6+ — Expansions

_P3 · agents_ — Character creator, fantasy animals, async multiplayer, factors/division/fractions, land and barn expansion, other Sanctuary titles. Not scheduled.

| Type | Title | Status | Assignee | Size | Pri |
| --- | --- | --- | --- | --- | --- |

