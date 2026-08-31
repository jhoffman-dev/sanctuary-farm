---
name: notion-board
description: Read, create, and move Sanctuary Farm tickets on the Notion board ("Sanctuary Farm DB"). Use to create tickets, set status as work progresses, add a note/comment, and link a PR. Requires a Notion integration token.
---

# Notion board

The single source of truth for work is the Notion database **Sanctuary Farm DB**.
Its schema and the board columns are documented in `docs/board.md`.

## Setup (one-time, human — see `docs/board.md` §Setup)

1. Jonathan creates a Notion **internal integration** and shares the database
   with it.
2. The token + database id go in `.claude/notion.local.json` (gitignored):
   ```json
   { "token": "ntn_xxx", "dbId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
   ```
   or as env vars `NOTION_TOKEN` / `SANCTUARY_FARM_DB_ID`.

If neither is present, **do not guess** — tell Jonathan the board can't be
reached and proceed with the code work, noting which tickets you would have
created/moved.

## Commands

All via `node .claude/skills/notion-board/notion.mjs <cmd> [args]`:

| Command | Does |
| --- | --- |
| `list [--status Ready]` | print tickets (id, key, title, type, status, assignee) |
| `get <SF-123>` | full ticket |
| `create --type Task --title "..." --epic SF-1 --status Backlog --file body.md` | create a ticket; prints its key |
| `move <SF-123> <Status>` | set Status (Backlog / Ready / In progress / In review / Done / Blocked) |
| `assign <SF-123> <Jonathan\|unassigned>` | set Assignee |
| `note <SF-123> "text"` | append a comment |
| `link <SF-123> <pr-url>` | set the PR field |

## Workflow (match `CLAUDE.md`)

- Claim a ticket: `move SF-123 "In progress"`.
- Open the PR, then: `link SF-123 <url>` and `move SF-123 "In review"`.
- After human merge: `move SF-123 Done`.
- Blocked on a human/decision: `move SF-123 Blocked` + `note` why + `assign` if
  it's Jonathan's.

Keep the board honest — never leave a ticket "In progress" that you've stopped.
