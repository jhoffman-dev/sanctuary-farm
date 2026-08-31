# The Notion board — "Sanctuary Farm DB"

The single source of truth for work. Humans watch it; agents work from it and
keep it current.

## Setup (Jonathan — one-time)

1. **Create an internal integration:** notion.so/my-integrations → *New
   integration* → internal → workspace with the DB. Copy the token (`ntn_…`).
2. **Share the database with it:** open "Sanctuary Farm DB" → `•••` →
   *Connections* → add the integration.
3. **Get the database id:** from the DB's URL —
   `notion.so/<workspace>/<32-hex-chars>?v=…` — the 32 hex chars.
4. **Store both locally (gitignored):** create `.claude/notion.local.json`:
   ```json
   { "token": "ntn_…", "dbId": "<32 hex chars>" }
   ```
   (or export `NOTION_TOKEN` and `SANCTUARY_FARM_DB_ID`.)
5. Run `node .claude/skills/notion-board/notion.mjs schema` — it prints the DB's
   current properties and tells you which are missing.
6. Add any missing properties (below), then
   `node .claude/skills/notion-board/notion.mjs import docs/backlog.csv` to load
   the starter backlog.

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
