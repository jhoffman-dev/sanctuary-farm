---
name: notion-board
description: Read, create, and move Sanctuary Farm tickets on the Notion board ("Sanctuary Farm DB"). Use to create tickets, set status as work progresses, add a note/comment, and link a PR. Uses the Notion MCP connector.
---

# Notion board

The single source of truth for work is the Notion database **Sanctuary Farm DB**.
Its schema and the board columns are documented in `docs/board.md`.

- **Database:** <https://app.notion.com/p/3cd672aa2c4a809ca13bddf87a2c9d64>
- **Data source (for SQL / create):** `collection://3cd672aa-2c4a-80ec-a1ab-000b40f7e4d1`

Work the board through the **Notion MCP tools** (`notion-fetch`,
`notion-query-data-sources`, `notion-create-pages`, `notion-update-page`,
`notion-create-comment`). If the connector isn't available in the session,
**do not guess** — tell James the board can't be reached, do the code work,
and note which tickets you would have created/moved.

Always `notion-fetch` the data source first in a session to get the current
schema (exact property names and select options).

## Common operations

**Find tickets** — `notion-query-data-sources` in SQL mode against the data
source. The `ID` column is `"userDefined:ID"` (Notion's Unique ID, `SF-1`…):

```sql
SELECT "userDefined:ID", Name, Type, Status, Assignee
FROM "collection://3cd672aa-2c4a-80ec-a1ab-000b40f7e4d1"
WHERE Status = 'Ready' ORDER BY Priority, Phase
```

**Read one ticket** — `notion-fetch` with its page URL (from a query result).

**Create a ticket** — `notion-create-pages` with
`parent: { data_source_id: "3cd672aa-2c4a-80ec-a1ab-000b40f7e4d1" }`. Set
`Name`, `Type`, `Status`, `Priority`, `Phase`, `Size`, and `Epic` (an array with
the parent Epic's page URL). Put the ticket body in `content`. Notion assigns the
`SF-N` id automatically — read it back with a query. Ticket shape: the
`write-ticket` skill.

**Move a ticket** — `notion-update-page`, `command: "update_properties"`,
`properties: { "Status": "In progress" }` (Backlog / Ready / In progress / In
review / Blocked / Done / Later). `Later` is James parking a decision — never
pick up or move a `Later` ticket.

**Assign** — `properties: { "Assignee": "James" }` or `{ "Assignee": null }`.

**Add a note** — `notion-create-comment` on the ticket's page URL.

**Link a PR** — `notion-update-page`, `properties: { "PR": "<url>" }` (plain `PR` — only `ID`/`URL`-named properties take the `userDefined:` prefix).

## Workflow (match `CLAUDE.md`)

- Claim a ticket: Status → `In progress`.
- Open the PR, then: set `PR` and Status → `In review`.
- After human merge: Status → `Done`.
- Blocked on a human/decision: Status → `Blocked` + a comment saying why +
  assign to James if it's his.

Keep the board honest — never leave a ticket "In progress" that you've stopped.

## Seeding / bulk changes

`docs/backlog.csv` / `docs/backlog.md` were the one-time seed (already imported).
Their source of truth is `scripts/notion/gen-backlog.mjs`. New tickets are
created directly in Notion from now on — don't re-import the CSV.
