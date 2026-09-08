import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Source of truth for the starter backlog. Emits docs/backlog.csv + docs/backlog.md.
const E = {
  P0: 'Phase 0 — Project foundation',
  P1: 'Phase 1 — Clean Architecture refactor',
  P2: 'Phase 2 — 3D rendering foundation',
  P3: 'Phase 3 — Alpha parity in 3D',
  P4: 'Phase 4 — Cloud save and identity',
  P5: 'Phase 5 — Polish and launch',
  P6: 'Phase 6+ — Expansions',
};

// [Type, Title, Status, Assignee, Size, Priority, Phase, Epic, Body]
const rows = [
  ['Epic', E.P0, 'In progress', '', 'M', 'P0', 'Phase 0', '', 'Housekeeping before feature work: docs, agents, skills, board, toolchain, CI/CD scaffolding, landing page. Done when a dev agent can pick a Ready ticket and ship it through CI to a preview deploy.'],
  ['Epic', E.P1, 'Backlog', '', 'M', 'P0', 'Phase 1', '', 'Move the prototype into a pnpm monorepo. Extract pure game logic into @sf/domain and @sf/application behind ports. apps/web becomes a thin presentation layer. See docs/architecture.md.'],
  ['Epic', E.P2, 'Backlog', '', 'M', 'P1', 'Phase 2', '', 'react-three-fiber world: camera, lighting, a controllable animated keeper, tap-to-move, one coherent asset pack, performance budget. See docs/implementation-plan.md.'],
  ['Epic', E.P3, 'Backlog', '', 'M', 'P1', 'Phase 3', '', 'Re-implement every prototype screen against @sf/application in the 3D shell: farmyard, barn, nest, paddock, feed shed, petting zoo, training ring, HUD, summary.'],
  ['Epic', E.P4, 'Backlog', '', 'M', 'P2', 'Phase 4', '', 'No-PII cloud save: save codes plus optional auto-generated username + PIN via a Firebase custom-auth Cloud Function. Firestore schema + rules. See ADR-0002.'],
  ['Epic', E.P5, 'Backlog', '', 'M', 'P2', 'Phase 5', '', 'Landing v1, deploy pipeline, PWA, accessibility pass, playtest with the target user, teacher feedback form, public alpha link.'],
  ['Epic', E.P6, 'Backlog', '', 'M', 'P3', 'Phase 6', '', 'Character creator, fantasy animals, async multiplayer, factors/division/fractions, land and barn expansion, other Sanctuary titles. Not scheduled.'],

  // ---- Phase 0: done this session ----
  ['Task', 'Install gh / firebase-tools / pnpm CLIs', 'Done', '', 'XS', 'P0', 'Phase 0', E.P0, 'Local toolchain. Installed gh 2.98, firebase-tools 15.28, pnpm 11.24.'],
  ['Task', 'Write the PRD', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'docs/PRD.md — one line, why, who, principles, core loop, alpha definition, success signals, non-goals.'],
  ['Task', 'Write the architecture spec', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'docs/architecture.md — Clean Architecture layers, the dependency rule per layer, monorepo layout, testing strategy, clean-code standards.'],
  ['Task', 'Write the implementation plan', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'docs/implementation-plan.md — phases 0 through 6.'],
  ['Task', 'Rewrite CLAUDE.md for architecture / clean code / testing', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'Requires Clean Architecture (the dependency rule), Clean Code (enforced in review), and a per-layer test bar (required to merge).'],
  ['Task', 'ADR-0001 — stack choice', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'Records TS / React / react-three-fiber over Unity / Godot / Flutter. Status Proposed — needs James to accept.'],
  ['Task', 'ADR-0002 — identity and save', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'No-PII identity: save codes, optional auto-generated username + PIN. Status Proposed — needs James to accept; privacy sanity-check pending.'],
  ['Task', 'Write the six agent definitions', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, '.claude/agents/: architect, domain-dev, app-dev, qa, reviewer, devops.'],
  ['Task', 'Write the core skills', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, '.claude/skills/: write-ticket, notion-board (+ notion.mjs CLI), adr, feature-workflow.'],
  ['Task', 'Set up the agent memory convention', 'Done', '', 'XS', 'P0', 'Phase 0', E.P0, '.claude/memory/ — MEMORY.md index plus one file per topic. Agents read at task start, append what the next agent needs.'],
  ['Task', 'Notion board schema spec + CLI', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'docs/board.md (schema, views, setup, flow) and .claude/skills/notion-board/notion.mjs.'],
  ['Task', 'Docs-to-Notion sync script', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'scripts/notion/sync-docs.mjs + lib.mjs — markdown docs are authored in the repo and pushed to Notion pages (Notion is where they are read). Manifest at scripts/notion/docs-manifest.json; index at docs/README.md. Needs a smoke test once the token lands.'],
  ['Task', 'Landing page v0 (static)', 'Done', '', 'S', 'P0', 'Phase 0', E.P0, 'apps/landing/ — static HTML/CSS: mission, current status checklist, future-games section. No build.'],
  ['Task', 'Refresh the README', 'Done', '', 'XS', 'P0', 'Phase 0', E.P0, 'GitHub-ready: what it is, doc index, run instructions, agents/skills, non-negotiables.'],
  ['Task', 'gitignore for secrets and monorepo', 'Done', '', 'XS', 'P0', 'Phase 0', E.P0, 'Stop ignoring all of .claude/; ignore only local state and secrets; add Firebase / env patterns.'],

  // ---- Phase 0: James ----
  ['Task', 'GitHub: auth and create the repo', 'Ready', 'James', 'XS', 'P0', 'Phase 0', E.P0, 'Interactive. gh auth login; decide visibility (see that ticket); gh repo create sanctuary-farm --source=. --push; set default branch to main. Unblocks CI.'],
  ['Task', 'Decide repository visibility (public vs private)', 'Ready', 'James', 'XS', 'P0', 'Phase 0', E.P0, 'Public fits free-forever and lets teachers/devs see it, but needs LICENSE + CODE_OF_CONDUCT and a clean history. Private is safe until launch. Recommendation: private now, public at Phase 5. Record the call.'],
  ['Task', 'Choose a license and add LICENSE', 'Ready', 'James', 'XS', 'P0', 'Phase 0', E.P0, 'Recommendation: AGPL-3.0 — keeps derivatives open, blocks a closed commercial fork, matches free-forever. MIT for maximum reuse. Add LICENSE + a README line.'],
  ['Task', 'Notion: create integration, share DB + a Docs page, add credentials', 'Ready', 'James', 'XS', 'P0', 'Phase 0', E.P0, 'Follow docs/board.md Setup: internal integration; share "Sanctuary Farm DB" AND a new empty page (e.g. "Sanctuary Farm — Docs") with it; put token + dbId + docsRootPageId in .claude/notion.local.json; run notion.mjs schema.'],
  ['Task', 'Notion: build the board and import the backlog', 'Ready', '', 'S', 'P0', 'Phase 0', E.P0, 'After the token is in .claude/notion.local.json: run notion.mjs setup (creates properties), add the "ID" property + the four views in the UI as it instructs, then notion.mjs import docs/backlog.csv. AC: the board shows every backlog ticket with Type/Status/Phase/Epic set.'],
  ['Task', 'Notion: push the docs and verify the sync', 'Ready', '', 'S', 'P0', 'Phase 0', E.P0, 'After the token + the Docs page exist: run node scripts/notion/sync-docs.mjs, open each created page, confirm headings / tables / code render acceptably, commit the manifest with its page ids and the updated docs/README.md. Fix mdToBlocks in scripts/notion/lib.mjs for anything mangled. AC: every manifest doc has a working Notion link.'],
  ['Task', 'Firebase: auth and create the project', 'Ready', 'James', 'S', 'P0', 'Phase 0', E.P0, 'Interactive. firebase login; create a project; pick a project id (e.g. sanctuary-farm-app); add two Hosting sites (game, landing); enable Firestore + Functions. Hand the project id back.'],
  ['Task', 'Decide GitHub Project vs Notion-only board', 'Ready', 'James', 'XS', 'P0', 'Phase 0', E.P0, 'Dual boards mean double bookkeeping. Recommendation: Notion is the single board; GitHub only for code + PRs + Actions. Record the call.'],
  ['Task', 'Decide analytics stance', 'Ready', 'James', 'XS', 'P0', 'Phase 0', E.P0, 'No per-user analytics (ADR-0002). Option: privacy-preserving aggregate counts with no identifiers. Recommendation: none for alpha. Record the call in a note or ADR.'],
  ['Task', 'Decide error monitoring', 'Ready', 'James', 'XS', 'P0', 'Phase 0', E.P0, 'Recommendation: none for alpha; if later, Sentry with PII scrubbing and no session replay. Record the call.'],
  ['Task', 'Decide a domain name', 'Backlog', 'James', 'XS', 'P1', 'Phase 0', E.P0, 'Optional for alpha — *.web.app works. If you want a real domain, register it and note it here for the Hosting custom-domain step.'],
  ['Task', 'Provide a low-end test device for QA', 'Backlog', 'James', 'XS', 'P1', 'Phase 0', E.P0, 'A Chromebook, old iPad, or similar. QA needs it to check the link-reachable / any-device principle before the alpha.'],
  ['Task', 'Privacy notice legal sanity-check', 'Backlog', 'James', 'S', 'P2', 'Phase 0', E.P0, 'Before the public alpha: have someone who knows COPPA/FERPA read docs/privacy.md and ADR-0002. Blocking for Phase 5, not now.'],

  // ---- Phase 0: agent-doable, remaining ----
  ['Task', 'pnpm workspace skeleton', 'Ready', '', 'S', 'P0', 'Phase 0', E.P0, 'pnpm-workspace.yaml, root package.json with -w scripts, packages/config with shared tsconfig / eslint / vitest presets. AC: pnpm -w typecheck runs; gate green.'],
  ['Task', 'ESLint import-boundary rules', 'Ready', '', 'S', 'P0', 'Phase 0', E.P0, 'Encode the dependency rule as eslint import restrictions. AC: a deliberate cross-layer import fails lint; tests: a fixture that must fail.'],
  ['Task', 'Pin Node and editor config', 'Ready', '', 'XS', 'P0', 'Phase 0', E.P0, '.nvmrc, engines, .editorconfig, prettier config aligned with oxlint. AC: node -v matches .nvmrc; gate green.'],
  ['Task', 'GitHub Actions CI workflow', 'Backlog', '', 'S', 'P0', 'Phase 0', E.P0, 'On PR: install (cache pnpm), typecheck, lint, unit, build, e2e smoke. Block merge on red. Blocked on the repo existing. AC: a trivial PR shows all checks.'],
  ['Task', 'GitHub branch protection on main', 'Backlog', 'James', 'XS', 'P0', 'Phase 0', E.P0, 'After CI exists: require CI checks + one review before merge to main; no direct pushes.'],
  ['Task', 'firebase.json and emulator config', 'Backlog', '', 'S', 'P1', 'Phase 0', E.P0, 'firebase.json (two hosting targets: game, landing), .firebaserc, Firestore rules + indexes stubs, functions/ scaffold, emulator config. Blocked on the Firebase project. AC: firebase emulators:start boots.'],
  ['Task', 'PR preview deploy workflow', 'Backlog', '', 'S', 'P1', 'Phase 0', E.P0, 'Action: Firebase Hosting preview channel per PR, prod on merge to main. Needs a Firebase CI token in GH secrets (James). Blocked on firebase.json.'],
  ['Task', 'Secrets management doc for agents', 'Ready', '', 'XS', 'P0', 'Phase 0', E.P0, 'docs/secrets.md — what secrets exist, where each lives, and the rule: never commit one, never put one in client code.'],
  ['Task', 'Issue and PR templates', 'Ready', '', 'XS', 'P1', 'Phase 0', E.P0, '.github/ISSUE_TEMPLATE + pull_request_template.md (linked ticket, what changed, how verified). AC: templates appear on GitHub.'],
  ['Task', 'Dependency update config', 'Ready', '', 'XS', 'P1', 'Phase 0', E.P0, 'Dependabot or Renovate for npm + Actions, weekly, grouped. AC: config committed; first PR opens once on GitHub.'],
  ['Task', 'CONTRIBUTING and CODE_OF_CONDUCT', 'Backlog', '', 'XS', 'P2', 'Phase 0', E.P0, 'Only if the repo goes public. CONTRIBUTING points at CLAUDE.md + the board; Contributor Covenant. Blocked on the visibility decision.'],
  ['Task', 'Definition of Done doc', 'Ready', '', 'XS', 'P0', 'Phase 0', E.P0, 'docs/definition-of-done.md — the checklist a ticket must meet. Referenced by qa and reviewer.'],
  ['Task', 'Curriculum design doc', 'Ready', '', 'M', 'P1', 'Phase 0', E.P0, 'docs/curriculum.md — alpha math scope (multiplication 0–12) and planned expansions, each mapped to Common Core, with fact ordering + introduction tiers. AC: reviewed by James.'],
  ['Task', 'Accessibility standard doc', 'Ready', '', 'S', 'P1', 'Phase 0', E.P0, 'docs/accessibility.md — target WCAG 2.2 AA plus game-specific rules (number-pad only, colour-blind-safe, keyboard-playable, reduced-motion, min font sizes, HUD labels). A checklist qa can run.'],
  ['Task', 'Performance budget doc', 'Ready', '', 'S', 'P1', 'Phase 0', E.P0, 'docs/performance-budget.md — targets for a low-end Chromebook: JS/asset transfer, TTI, sustained FPS, max triangles + texture memory, max draw calls. Feeds Phase 2.'],
  ['Task', 'Kid-safety threat model', 'Ready', '', 'S', 'P1', 'Phase 0', E.P0, 'docs/threat-model.md — what could harm a child user or leak data (free-text surfaces, username guessing, save-code sharing, Firestore rule gaps, third-party scripts, deploy of secrets), with a mitigation per item.'],
  ['Task', 'Art direction / style guide doc', 'Backlog', '', 'S', 'P1', 'Phase 0', E.P0, 'docs/art-direction.md — the look: 2.5D, warm, readable silhouettes, palette, which one asset pack. Partly blocked on the asset-pack ADR.'],
  ['Task', 'Sound design approach doc', 'Backlog', '', 'XS', 'P2', 'Phase 0', E.P0, 'docs/sound-design.md — synth vs sampled, the correct-answer feedback sound, ambient bed, mute-by-default question, no punishing failure sounds.'],
  ['Task', 'Privacy notice draft', 'Ready', '', 'S', 'P1', 'Phase 0', E.P0, 'docs/privacy.md — plain-language, two short versions (kid-readable and parent/teacher): what is and is not collected, what a save code / username is, how to delete. Feeds the legal sanity-check.'],
  ['Task', 'Firestore backup strategy doc', 'Backlog', '', 'XS', 'P2', 'Phase 0', E.P0, 'docs/firestore-backup.md — scheduled export to a bucket, retention, restore steps. Implement in Phase 4.'],
  ['Task', 'Landing: favicon, social meta, OG image', 'Backlog', '', 'XS', 'P2', 'Phase 0', E.P0, 'apps/landing/ — favicon, description/OG/Twitter meta, a simple 1200x630 share image. AC: link preview renders.'],
  ['Task', 'Landing: verify in browser and deploy', 'Backlog', '', 'XS', 'P2', 'Phase 0', E.P0, 'Run the landing page in a real browser, screenshot desktop + mobile, check contrast + keyboard focus, then deploy to the landing Hosting site. Blocked on firebase.json.'],

  // ---- Phase 1 ----
  ['Story', 'Extract @sf/domain from the prototype', 'Backlog', '', 'M', 'P0', 'Phase 1', E.P1, 'Move the scheduler, curriculum, mastery, latency grading into packages/domain as pure functions. Inject Clock + Rng ports. No React, no localStorage, no Date.now/Math.random. AC: domain unit tests ~90%+; prototype still runs via an adapter; gate green.'],
  ['Story', 'Define @sf/application use-cases and ports', 'Backlog', '', 'M', 'P0', 'Phase 1', E.P1, 'Use-cases (next question, grade answer, run chores, hatch egg, care task, goodnight) and ports (SaveStore, Clock, Rng, AudioBus, IdProvider). AC: every use-case covered with fake adapters; apps/web calls only these.'],
  ['Task', 'Move the prototype under apps/web', 'Backlog', '', 'S', 'P1', 'Phase 1', E.P1, 'Relocate src/ to apps/web/src, wire the workspace, keep tests green. AC: pnpm -w test green; app runs.'],
  ['Task', 'localStorage SaveStore adapter', 'Backlog', '', 'S', 'P1', 'Phase 1', E.P1, 'packages/persistence — implement SaveStore over the existing versioned localStorage key incl. the v2 migration. AC: round-trip + migration integration tests.'],
  ['Task', 'Web Audio AudioBus adapter', 'Backlog', '', 'S', 'P2', 'Phase 1', E.P1, 'packages/audio — implement AudioBus over the existing Web Audio synth. AC: adapter tested; presentation no longer imports audio internals.'],

  // ---- Phase 2 ----
  ['Task', 'Spike: r3f character controller', 'Backlog', '', 'S', 'P0', 'Phase 2', E.P2, 'Timebox 1 day. Load a rigged glTF, play idle/walk from Mixamo, crossfade on velocity, tap-to-move on a ground plane, isometric-ish camera. AC: findings + recommendation in docs/adr/000N-3d-foundation.md; throwaway branch.'],
  ['Task', 'Spike: asset pack decision', 'Backlog', '', 'S', 'P0', 'Phase 2', E.P2, 'Timebox. Compare Kenney (CC0) vs Quaternius (CC0) vs Synty POLYGON (paid) for a coherent farm set with riggable animals + a humanoid keeper. AC: an ADR with the pick, cost, licence terms.'],
  ['Task', 'Spike: world layout tooling decision', 'Backlog', '', 'S', 'P1', 'Phase 2', E.P2, 'Timebox. How James lays out the farm without hand-editing coordinates — Blender, Tiled, or a small in-app editor. AC: ADR with the pick and why.'],

  // ---- Phase 5 seeds ----
  ['Story', 'Landing v1', 'Backlog', '', 'M', 'P2', 'Phase 5', E.P5, 'Upgrade apps/landing from v0: real screenshots/video of the alpha, the public play link, the feedback form link, teacher note. AC: verified in browser, deployed, link previews work.'],
  ['Story', 'Teacher feedback form', 'Backlog', '', 'S', 'P2', 'Phase 5', E.P5, 'A way for a teacher or student to send feedback with no student data collected (no email required; free text from adults only, never shown to kids). AC: submissions land somewhere James can read; threat-model checked.'],
  ['Story', 'PWA / add-to-home-screen', 'Backlog', '', 'S', 'P2', 'Phase 5', E.P5, 'Manifest + icons + offline shell so the game opens full-screen from a home-screen icon on iPad/Chromebook. AC: installs and launches on the test device.'],
  ['Story', 'Accessibility pass', 'Backlog', '', 'M', 'P1', 'Phase 5', E.P5, 'Run the docs/accessibility.md checklist end to end. AC: every item passes or has a filed follow-up.'],
  ['Story', 'Playtest with the target user', 'Backlog', 'James', 'S', 'P1', 'Phase 5', E.P5, 'Sit with Sophie through a full session on the test device. Note every confusion and drop-off. File each as a Bug or Story. AC: notes captured, tickets filed.'],
];

function csvCell(s) {
  s = String(s ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const header = ['Type', 'Title', 'Status', 'Assignee', 'Size', 'Priority', 'Phase', 'Epic', 'Body'];
const csv = [header.join(',')]
  .concat(rows.map((r) => r.map(csvCell).join(',')))
  .join('\n');
writeFileSync(resolve(REPO, 'docs/backlog.csv'), csv + '\n');

// ---- backlog.md ----
const byEpic = new Map();
const epics = rows.filter((r) => r[0] === 'Epic');
for (const e of epics) byEpic.set(e[1], []);
for (const r of rows) if (r[0] !== 'Epic') (byEpic.get(r[7]) ?? byEpic.set(r[7], []).get(r[7])).push(r);

let md = `# Starter backlog\n\n`;
md += `Generated from \`scripts/notion/gen-backlog.mjs\` (source of truth) into this file and\n\`docs/backlog.csv\` (import with the \`notion-board\` skill). Ticket shape: see the\n\`write-ticket\` skill. Keys (SF-N) are assigned by Notion on import.\n\n`;
md += `**Legend** — Status: Backlog / Ready / In progress / In review / Blocked / Done ·\nAssignee: _blank_ = any agent, **James** = needs a human ·\nSize: XS / S / M · Priority: P0 (now) / P1 / P2.\n\n`;
md += `## At a glance\n\n`;
md += `| | Count |\n| --- | --- |\n`;
const count = (f) => rows.filter(f).length;
md += `| Epics | ${count((r) => r[0] === 'Epic')} |\n`;
md += `| Tickets total | ${count((r) => r[0] !== 'Epic')} |\n`;
md += `| Done | ${count((r) => r[2] === 'Done')} |\n`;
md += `| Ready | ${count((r) => r[2] === 'Ready')} |\n`;
md += `| Assigned to James | ${count((r) => r[3] === 'James')} |\n\n`;

for (const e of epics) {
  md += `## ${e[1]}\n\n`;
  md += `_${e[5]} · ${e[3] || 'agents'}_ — ${e[8]}\n\n`;
  const kids = byEpic.get(e[1]) ?? [];
  md += `| Type | Title | Status | Assignee | Size | Pri |\n| --- | --- | --- | --- | --- | --- |\n`;
  for (const k of kids) {
    md += `| ${k[0]} | ${k[1]} | ${k[2]} | ${k[3] || '—'} | ${k[4]} | ${k[5]} |\n`;
  }
  md += `\n`;
  for (const k of kids) {
    md += `**${k[1]}** — ${k[8]}\n\n`;
  }
}
writeFileSync(resolve(REPO, 'docs/backlog.md'), md);
console.log(`wrote docs/backlog.csv (${rows.length} rows) and docs/backlog.md`);
