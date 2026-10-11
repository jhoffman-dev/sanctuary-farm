# Docs

These docs are **mirrored to Notion** — that is where to read them. The markdown
here is authored via PR; after a merge, push the change to its Notion page with
the `notion-docs` skill (Notion MCP connector). `CLAUDE.md` stays repo-only (it
is the agent entry point).

**Project page:** [Sanctuary Farm — Student Game Project](https://app.notion.com/p/3cd672aa2c4a814e8714e77635cc762a)
· **Docs page:** [Docs](https://app.notion.com/p/3d5672aa2c4a80ecaed8f07d0875b5aa)
· **ADRs:** [ADR's](https://app.notion.com/p/3d5672aa2c4a809791c7dd75c84db1e9)

## Written and mirrored

| Doc | Notion |
| --- | --- |
| `docs/PRD.md` — PRD | [PRD](https://app.notion.com/p/3cd672aa2c4a8113bb55cd14ae8ba037) |
| `docs/implementation-plan.md` — Implementation plan | [Implementation plan](https://app.notion.com/p/3cd672aa2c4a81d8980fe750603fc217) |
| `docs/architecture.md` — Architecture | [Architecture](https://app.notion.com/p/3cd672aa2c4a819ebe7dff338eff761b) |
| `docs/board.md` — The board (GitHub Issues + Project) | [The board — Sanctuary Farm DB](https://app.notion.com/p/3cd672aa2c4a81da9d1ed7d9485ef7f6) |
| `docs/adr/0001-stack-choice.md` — ADR-0001 — Stack choice | [ADR-0001 — Stack choice](https://app.notion.com/p/3cd672aa2c4a817ba78efec138934090) |
| `docs/adr/0002-identity-and-save.md` — ADR-0002 — Identity and save | [ADR-0002 — Identity and save](https://app.notion.com/p/3cd672aa2c4a81248dc7e3fe500b1e02) |
| `docs/adr/0003-asset-pack.md` — ADR-0003 — Asset pack: Kenney (accepted 2026-10-07, SF-64) | to mirror under ADR's after merge (skill: `notion-docs`) |
| `docs/adr/0004-3d-foundation.md` — ADR-0004 — 3D foundation (proposed, SF-63) | to mirror under ADR's after merge (skill: `notion-docs`) |
| `docs/adr/0005-world-layout-tooling.md` — ADR-0005 — World layout tooling: procedural tile world with authored overrides (proposed, SF-65, revised for SF-87; Godot update 2026-10-11) | to mirror under ADR's after merge (skill: `notion-docs`) |
| `docs/adr/0006-engine-godot.md` — ADR-0006 — Engine: Godot 4.7 (GDScript) in `game/` (accepted 2026-10-11, SF-93; supersedes ADR-0001's engine choice) | to mirror under ADR's after merge (skill: `notion-docs`) |
| `docs/definition-of-done.md` — Definition of Done | [Definition of Done](https://app.notion.com/p/3d5672aa2c4a81e3b249d3d0eadd617f) |
| `docs/secrets.md` — Secrets | [Secrets](https://app.notion.com/p/3d5672aa2c4a81579d29fec27113d844) |
| `docs/curriculum.md` — Curriculum | [Curriculum](https://app.notion.com/p/3d5672aa2c4a811abf0fdab381a16881) |
| `docs/accessibility.md` — Accessibility standard | [Accessibility standard](https://app.notion.com/p/3d5672aa2c4a81f98501dd18cb1a8307) |
| `docs/performance-budget.md` — Performance budget | [Performance budget](https://app.notion.com/p/3d5672aa2c4a8152aa5ae7e1bd8ca1db) |
| `docs/threat-model.md` — Kid-safety threat model | [Kid-safety threat model](https://app.notion.com/p/3d5672aa2c4a816299e2eebd491df653) |
| `docs/privacy.md` — Privacy notice (draft) | [Privacy notice (draft)](https://app.notion.com/p/3d5672aa2c4a81219cd5c8fd8b02d271) |
| `docs/art-direction.md` — Art direction | [Art direction](https://app.notion.com/p/3d5672aa2c4a81529810c1d09a0a4d84) |
| `docs/sound-design.md` — Sound design | [Sound design](https://app.notion.com/p/3d5672aa2c4a817cb90ac1dde2cfeb58) |
| `docs/firestore-backup.md` — Firestore backup strategy | [Firestore backup strategy](https://app.notion.com/p/3d5672aa2c4a815e83eec341bd398b13) |
| `docs/deploy.md` — Deploying into the shared Student Games project | *not mirrored yet — add under Docs and link here* |
| [`docs/world-editor.md`](world-editor.md) — World editor: how to use it (`pnpm dev`, `?edit=1`) | not yet mirrored; push after merge |
| [`docs/barn-care.md`](barn-care.md) — Barn care rules: health, the four care tasks, glum not gone (SF-107) | not yet mirrored; push after merge |

Repo-only, not mirrored: `docs/notion-migration.md` (the SF-1 … SF-80 → issue
#30 … #109 map from the 2026-10-04 board move).

History only, not mirrored: `docs/original-spec.md` and `docs/redesign-notes.md`
(the prototype era; the prototype itself was removed in the rebuild — see git
history before the `chore(SF-36)` commit). Notion also holds James's own
"Pet Sanctuary Math — Build Spec" page under Docs.

## Adding a doc

Every Phase 0 doc is written and mirrored. For a new one: create the file via
PR, then add it under the Docs page and to the table above (skill:
`notion-docs`).
