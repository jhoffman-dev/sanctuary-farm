# Handoff — get the project into Notion

> **Temporary bridge doc.** Delete it once everything below is in Notion.
> Written 2026-08-31 because the session that did the foundation work had no
> Notion MCP connection. A fresh session with the Notion connector should pick
> up here.

## The one instruction

**Notion is Jonathan's source of truth for everything** — tickets, docs, plans,
decisions. "If it isn't in Notion, I won't see it." Repo markdown / CSV is only a
working surface. Your job: make the Notion side real, then confirm it exists —
don't hand back a CSV.

If you have Notion MCP tools: use them directly. Ignore the `notion.mjs` /
`.claude/notion.local.json` token path entirely (and delete that path once the
board is up — see "Cleanup" below).

## Where things are

- Repo: `/Users/jhoffman/Projects/sanctuary-farm`, branch `main`, no remote yet.
- Last commit: `a44678a`. Prototype gate green: `npm run typecheck && npm run
  lint && npm test` (162 tests). Node is Homebrew — `export PATH="/opt/homebrew/bin:$PATH"`.
- Foundation work committed in `4baab4b`, `186b581`, `a44678a`: `docs/` (PRD,
  architecture, implementation-plan, adr/, board.md), `.claude/agents/` (6),
  `.claude/skills/` (write-ticket, notion-board, adr, feature-workflow,
  notion-docs), `.claude/memory/`, `apps/landing/`, rewritten `CLAUDE.md`.

## Task 1 — the board: Notion DB "Sanctuary Farm DB"

Jonathan already created the database. Set it up and load it.

### Properties

| Property | Type | Options |
| --- | --- | --- |
| Name | Title | — |
| ID | Unique ID | prefix `SF` (stable ticket keys) |
| Type | Select | Epic, Story, Task, Bug |
| Status | Status (or Select) | Backlog, Ready, In progress, In review, Blocked, Done |
| Assignee | Select | Jonathan  (empty = any agent) |
| Size | Select | XS, S, M |
| Priority | Select | P0, P1, P2 |
| Phase | Select | Phase 0 … Phase 6 |
| Epic | Relation → same DB | parent Epic (and Story, for Tasks) |
| PR | URL | — |

### Views

- **Board** — group by Status, order Backlog → Ready → In progress → In review → Blocked → Done.
- **By phase** — group by Phase, filter Status ≠ Done.
- **Jonathan's queue** — filter Assignee = Jonathan, Status ≠ Done.
- **Backlog** — table, filter Status = Backlog, sort Priority then Phase.

### The tickets

All 63 are in **`docs/backlog.csv`** (columns: Type, Title, Status, Assignee,
Size, Priority, Phase, Epic, Body — `Epic` names the parent Epic's title).
`docs/backlog.md` is the same list, readable. Create Epics first so the relation
resolves. 7 Epics (one per phase), 15 already `Done` (the foundation work — create
them as Done for the record), 22 `Ready`, rest `Backlog`. 13 are assigned
`Jonathan`.

The source of truth for that list is `scripts/notion/gen-backlog.mjs` — if you
need to change tickets in bulk before import, edit the `rows` array there and
`node scripts/notion/gen-backlog.mjs`.

After import: `docs/backlog.csv` / `.md` are just the seed. New tickets are
created directly in Notion from then on.

## Task 2 — the docs

Mirror these repo docs to Notion pages under a "Sanctuary Farm — Docs" page
(create it if it doesn't exist). List with intended titles is in
**`scripts/notion/docs-manifest.json`**. The ones that exist now:

- `docs/PRD.md`, `docs/implementation-plan.md`, `docs/architecture.md`,
  `docs/board.md`, `docs/adr/0001-stack-choice.md`, `docs/adr/0002-identity-and-save.md`

The rest in the manifest (curriculum, accessibility, performance-budget,
threat-model, privacy, art-direction, sound-design, definition-of-done, secrets)
are **not written yet** — they're `Ready` tickets. Skip them until they exist.

`CLAUDE.md` stays repo-only (agent entry point) — do not mirror it.

Going forward: docs are authored as markdown via PR, then pushed to Notion. If
you have Notion MCP, the push is a connector call; otherwise it was
`scripts/notion/sync-docs.mjs`.

## Task 3 — update the tooling for MCP

Once the board + docs are in Notion via the connector:

- Rewrite `.claude/skills/notion-board/SKILL.md` and `.claude/skills/notion-docs/SKILL.md`
  to use the Notion MCP tools instead of the CLI.
- Update `.claude/agents/*.md` references (`architect`, `domain-dev`, `app-dev`,
  `qa`, `devops` mention `notion-board` / `notion-docs`).
- Update `CLAUDE.md` §"Agents & skills" and §Workflow.
- **Cleanup:** delete `.claude/skills/notion-board/notion.mjs`,
  `scripts/notion/lib.mjs`, `scripts/notion/sync-docs.mjs`,
  `scripts/notion/docs-manifest.json`, and the `notion.local.json` /
  `docsRootPageId` bits from `docs/board.md` — unless Jonathan wants the CLI kept
  as a fallback. Keep `scripts/notion/gen-backlog.mjs` (it's just the ticket data).
- Update the two board tickets ("Notion: build the board and import the backlog",
  "Notion: push the docs and verify the sync") to Done, and this handoff doc's
  ticket if one exists.
- Delete this file.

## Still pending decisions (Jonathan) — these are tickets too

- Accept/amend ADR-0001 (stack) and ADR-0002 (identity) — currently Proposed.
- Repo visibility (rec: private now, public at Phase 5); license (rec: AGPL-3.0).
- `gh auth login` + create the GitHub repo + push.
- `firebase login` + create the Firebase project + hand back the project id.
- GitHub Project vs Notion-only (rec: Notion only); analytics (rec: none);
  error monitoring (rec: none for alpha).

## Key project context (also in memory)

- Solo dev (Jonathan) + AI agents. **Never say "team."** Timelines assume agents
  do the work.
- Free forever, no ads, no purchases, **no PII**. Stack locked: TS / React /
  react-three-fiber (ADR-0001). Rebuild to a Clean Architecture pnpm monorepo is
  Phase 1+; the `src/` prototype is the current playable alpha.
- Game non-negotiables: no multiple choice; latency drives mastery; coins only
  from paddock + nest; interleave; goodnight; no punishment framing.
