# The board and docs in Notion — "Sanctuary Farm DB"

Notion holds two things: the **board** (tickets — the single source of truth for
work) and the **docs** (PRD, plan, architecture, ADRs — mirrored from the repo,
read here). Humans watch both; agents work from the board and keep it current.
We do **not** use GitHub Issues or Projects — the Notion board only.

Everything sits under one Notion page:

- **Project page:** [Sanctuary Farm — Student Game Project](https://app.notion.com/p/3cd672aa2c4a814e8714e77635cc762a)
  - **Board:** [Sanctuary Farm DB](https://app.notion.com/p/3cd672aa2c4a809ca13bddf87a2c9d64)
    (data source `collection://3cd672aa-2c4a-80ec-a1ab-000b40f7e4d1`)
  - **Docs:** [Docs](https://app.notion.com/p/3d5672aa2c4a80ecaed8f07d0875b5aa) — one
    page per doc; ADRs under its [ADR's](https://app.notion.com/p/3d5672aa2c4a809791c7dd75c84db1e9) subpage

## Access

Agents read and write the board and docs through the **Notion MCP connector**
(skills: `notion-board`, `notion-docs`). There is no local token or CLI. If the
connector isn't available in a session, say so and proceed with code work,
noting what you would have changed on the board.

The board was built and the starter backlog imported on 2026-08-31. Schema,
views, and all seed tickets are live — the setup below is a record, not a
to-do.

## Schema

| Property | Type | Values |
| --- | --- | --- |
| **Name** | Title | the ticket title |
| **ID** | Unique ID | prefix `SF` — Notion auto-numbers (`SF-1`, `SF-2`, …) |
| **Type** | Select | `Epic` · `Story` · `Task` · `Bug` |
| **Status** | Select | `Backlog` · `Ready` · `In progress` · `In review` · `Blocked` · `Done` · `Later` |
| **Assignee** | Select | `James` (human-only) · *empty* = any agent |
| **Size** | Select | `XS` · `S` · `M` |
| **Priority** | Select | `P0` · `P1` · `P2` · `P3` |
| **Phase** | Select | `Phase 0` … `Phase 6` |
| **Epic** | Relation → same DB | the parent Epic (and Story for Tasks); back-relation `Children` |
| **PR** | URL | the pull request, once opened |

## Views

- **Board** — group by `Status`, ordered `Backlog → Ready → In progress → In
  review → Blocked → Done`. The working view.
- **By phase** — board grouped by `Phase`, filtered `Status ≠ Done`. Roadmap at a
  glance.
- **James' queue** — table, filter `Assignee = James` and `Status ≠ Done`.
  The human to-do list.
- **Backlog** — table, filter `Status = Backlog`, sort `Priority` then `Phase`.

## How work flows

`Backlog` (not started) → `Ready` (unblocked, next up) → `In progress` (an agent
claimed it) → `In review` (PR open, qa + reviewer) → `Done` (human merged).
`Blocked` any time, with a note saying why. `Later` parks a decision James has
deliberately deferred — leave those alone.

Agents move their own tickets (skill: `notion-board`). See `CLAUDE.md` §Workflow.

## Docs

The prose docs live as markdown in `docs/` (authored via PR) and are mirrored to
Notion pages under the Docs page. Notion is where to **read** them; edit the
markdown and push the change with the `notion-docs` skill. `docs/README.md` is
the link index. `CLAUDE.md` is deliberately not mirrored — it's the agent entry
point and stays in the repo.
