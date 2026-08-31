# The board and docs in Notion — "Sanctuary Farm DB"

Notion holds two things: the **board** (tickets — the single source of truth for
work) and the **docs** (PRD, plan, architecture, ADRs — mirrored from the repo,
read here). Humans watch both; agents work from the board and keep it current.

## Setup (Jonathan — one-time)

1. **Create an internal integration:** notion.so/my-integrations → *New
   integration* → internal → the workspace with the DB. Copy the token (`ntn_…`).
2. **Share the database with it:** open "Sanctuary Farm DB" → `•••` →
   *Connections* → add the integration.
3. **Create a docs home:** add a new empty page (e.g. "Sanctuary Farm — Docs"),
   and share it with the integration the same way.
4. **Get the ids:** each from its URL — `notion.so/<workspace>/<32-hex-chars>?…` —
   the 32 hex chars are the database id / page id.
5. **Store locally (gitignored):** create `.claude/notion.local.json`:
   ```json
   { "token": "ntn_…", "dbId": "<db 32 hex>", "docsRootPageId": "<page 32 hex>" }
   ```
   (or the env vars `NOTION_TOKEN` / `SANCTUARY_FARM_DB_ID` /
   `SANCTUARY_FARM_DOCS_PAGE_ID`.)
6. `node .claude/skills/notion-board/notion.mjs setup` — creates the missing
   properties (below) via the API and prints the one or two it can't (the **ID**
   property; native Status options), which take ~20 s in the UI.
7. Add the four views (below), then
   `node .claude/skills/notion-board/notion.mjs import docs/backlog.csv` to load
   the starter backlog.
8. `node scripts/notion/sync-docs.mjs` to push the docs, then commit the updated
   `scripts/notion/docs-manifest.json` and `docs/README.md`.

Steps 6–8 can be run by an agent once the token is in place — hand it off.

## Schema

| Property | Type | Values |
| --- | --- | --- |
| **Name** | Title | the ticket title |
| **ID** | Unique ID | prefix `SF` — Notion auto-numbers (`SF-1`, `SF-2`, …) |
| **Type** | Select | `Epic` · `Story` · `Task` · `Bug` |
| **Status** | Status | `Backlog` · `Ready` · `In progress` · `In review` · `Blocked` · `Done` |
| **Assignee** | Select | `Jonathan` (human-only) · *empty* = any agent |
| **Size** | Select | `XS` · `S` · `M` |
| **Priority** | Select | `P0` · `P1` · `P2` |
| **Phase** | Select | `Phase 0` … `Phase 6` |
| **Epic** | Relation → same DB | the parent Epic (and Story for Tasks) |
| **PR** | URL | the pull request, once opened |

> Use Notion's built-in **Unique ID** property so keys are stable and
> auto-assigned. The API can't set it on create; the script reads it back and
> prints it.

## Views

- **Board** — group by `Status`, ordered `Backlog → Ready → In progress → In
  review → Blocked → Done`. The working view.
- **By phase** — board grouped by `Phase`, filtered `Status ≠ Done`. Roadmap at a
  glance.
- **Jonathan's queue** — filter `Assignee = Jonathan` and `Status ≠ Done`. The
  human to-do list.
- **Backlog** — table, filter `Status = Backlog`, sort `Priority` then `Phase`.

## How work flows

`Backlog` (not started) → `Ready` (unblocked, next up) → `In progress` (an agent
claimed it) → `In review` (PR open, qa + reviewer) → `Done` (human merged).
`Blocked` any time, with a note saying why.

Agents move their own tickets (skill: `notion-board`). See `CLAUDE.md` §Workflow.

## Docs

The prose docs live as markdown in `docs/` (authored via PR) and are mirrored to
Notion pages under the docs home. Notion is where to **read** them; edit the
markdown and re-sync. `scripts/notion/docs-manifest.json` is the list;
`docs/README.md` is the link index; `scripts/notion/sync-docs.mjs` does the push
(skill: `notion-docs`). `CLAUDE.md` is deliberately not mirrored — it's the
agent entry point and stays in the repo.
