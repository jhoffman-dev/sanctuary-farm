# The board — GitHub Issues + "Sanctuary Farm Project"

Tickets are **GitHub issues** on `jhoffman-dev/sanctuary-farm`, tracked on the
GitHub Project **"Sanctuary Farm Project"** (owner `jhoffman-dev`). That is the
single source of truth for work. Agents work from it and keep it current with
the `gh` CLI (skill: `github-board`).

The prose docs (PRD, plan, architecture, ADRs…) are still **mirrored to Notion**
— see `docs/README.md` and the `notion-docs` skill. Only the board moved.

## How tickets map

| Ticket field | On GitHub |
| --- | --- |
| ID | issue title prefix `[SF-n]` — numbering continues (`SF-81`, …) |
| Name | issue title after the prefix: `[SF-81] Add the barn` |
| Phase | **milestone**, titled by the epic: `Phase 2 — 3D rendering foundation` |
| Type | label `type: epic` · `type: story` · `type: task` · `type: bug` |
| Priority | label `priority: P0` … `priority: P3` |
| Size | label `size: XS` · `size: S` · `size: M` |
| Epic / parent | GitHub **sub-issue** of its parent; the phase epics are #30–#36 (Phase 0–6+) |
| Assignee | `jhoffman-dev` = needs James (human-only) · unassigned = any agent |
| Status | `Done` → issue **closed** (completed) · `Blocked` → label `blocked` · `Later` → label `later` (James deferred it — leave alone) · `Backlog` / `Ready` / `In progress` / `In review` → the project's **Status** field |
| PR | the PR body says `Closes #<issue>`; GitHub links and closes it on merge |

The Status field's exact option names live on the project — read them, don't
guess: `gh project field-list <N> --owner jhoffman-dev`.

## How work flows

`Backlog` (not started) → `Ready` (unblocked, next up) → `In progress` (an agent
claimed it) → `In review` (PR open, qa + reviewer) → closed (human merged the PR
with `Closes #n`). Add `blocked` any time, with a comment saying why.
Branch names keep the ticket key: `feat/SF-123-short-slug`. See `CLAUDE.md`
§Workflow and the `feature-workflow` skill.

## Common moves

`gh` needs the `project` scope for `gh project …` (`gh auth refresh -s project`);
issue commands need only `repo`. `R=jhoffman-dev/sanctuary-farm`; `<N>` is the
project number from `gh project list --owner jhoffman-dev`.

```sh
# My queue (James) / the agents' queue
gh issue list -R $R --assignee @me --state open
gh issue list -R $R --search "no:assignee -label:later -label:blocked" --state open

# Read one ticket
gh issue view 123 -R $R --comments

# Create a ticket: next number, then the issue
gh issue list -R $R --search "SF- in:title" --state all --limit 500 --json title \
  --jq '[.[].title | capture("^\\[SF-(?<n>[0-9]+)\\]").n | tonumber] | max + 1'
gh issue create -R $R --title "[SF-81] Add the barn" --body-file ticket.md \
  --milestone "Phase 3 — Alpha parity in 3D" \
  --label "type: story" --label "priority: P1" --label "size: S"

# Make it a sub-issue of its epic (needs the child's numeric id, not its number)
gh api repos/$R/issues/33/sub_issues -F sub_issue_id=$(gh api repos/$R/issues/110 --jq .id)

# Add it to the project (prints the project item id)
gh project item-add <N> --owner jhoffman-dev --url https://github.com/$R/issues/110 --format json --jq .id

# Move status: look up the ids once, then edit the item
gh project view <N> --owner jhoffman-dev --format json --jq .id            # project id
gh project field-list <N> --owner jhoffman-dev --format json               # Status field id + option ids
gh project item-list <N> --owner jhoffman-dev --limit 500 --format json \
  --jq '.items[] | select(.content.number==110) | .id'                     # item id
gh project item-edit --project-id <project-id> --id <item-id> \
  --field-id <status-field-id> --single-select-option-id <option-id>

# Blocked / unblocked, with the reason
gh issue edit 110 -R $R --add-label blocked && gh issue comment 110 -R $R --body "Blocked: …"
gh issue edit 110 -R $R --remove-label blocked
```

## History

The board lived in Notion ("Sanctuary Farm DB") from 2026-08-31 to 2026-10-04.
On 2026-10-04 all 80 tickets (SF-1 … SF-80) became issues #30 … #109 — **issue
number = SF number + 29**; `docs/notion-migration.md` has the full map, and each
issue body starts with a blockquote linking its original Notion page. The Notion
board is left in place, read-only:
[Sanctuary Farm DB](https://app.notion.com/p/3cd672aa2c4a809ca13bddf87a2c9d64).
