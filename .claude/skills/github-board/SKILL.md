---
name: github-board
description: Read, create, and move Sanctuary Farm tickets — GitHub issues on jhoffman-dev/sanctuary-farm, tracked on the "Sanctuary Farm Project" GitHub Project — with the gh CLI. Use to find your queue, create a ticket, set status as work progresses, add a comment, or mark a ticket blocked.
---

# GitHub board

The single source of truth for work is **GitHub Issues** on
`jhoffman-dev/sanctuary-farm`, tracked on the GitHub Project **"Sanctuary Farm
Project"** (owner `jhoffman-dev`). `docs/board.md` has the full field mapping and
copy-paste commands; this is the working summary.

Use the `gh` CLI (prefix Bash with `export PATH="/opt/homebrew/bin:$PATH"`).
Issue commands need the `repo` scope; `gh project …` needs `project` — if it's
missing, say so and ask James to run `gh auth refresh -s project`; carry on with
the issue-level steps meanwhile.

## The shape of a ticket

- Title `[SF-n] <name>` — numbering continues past the Notion era (SF-81 on).
  Old `SF-n` ≤ 80 is issue `n + 29` (`docs/notion-migration.md`).
- Phase = **milestone** (`Phase 3 — Alpha parity in 3D`, …).
- Labels: `type: epic|story|task|bug`, `priority: P0..P3`, `size: XS|S|M`, plus
  `blocked` (with a comment saying why) and `later` (James deferred it — leave
  it alone).
- Parent = GitHub **sub-issue**. Phase epics are #30 (Phase 0) … #36 (Phase 6+).
- Assignee `jhoffman-dev` = needs James; unassigned = any agent.
- Status `Backlog` / `Ready` / `In progress` / `In review` = the project's
  **Status** field. Done = issue closed. Read the field's real options first:
  `gh project field-list <N> --owner jhoffman-dev` (`<N>` from
  `gh project list --owner jhoffman-dev`).

## Moves

**Find work** — `gh issue list -R jhoffman-dev/sanctuary-farm --search "no:assignee -label:later -label:blocked" --state open`,
then prefer items whose project Status is `Ready`
(`gh project item-list <N> --owner jhoffman-dev --limit 500 --format json`).

**Read one** — `gh issue view <n> -R jhoffman-dev/sanctuary-farm --comments`.

**Create** (shape: `write-ticket` skill):
1. Next number: `gh issue list -R jhoffman-dev/sanctuary-farm --search "SF- in:title" --state all --limit 500 --json title --jq '[.[].title | capture("^\\[SF-(?<n>[0-9]+)\\]").n | tonumber] | max + 1'`.
2. `gh issue create -R jhoffman-dev/sanctuary-farm --title "[SF-n] …" --body-file <file> --milestone "<phase epic title>" --label "type: task" --label "priority: P2" --label "size: S"` (add `--assignee jhoffman-dev` only if a human must do it).
3. Sub-issue of its parent: `gh api repos/jhoffman-dev/sanctuary-farm/issues/<parent>/sub_issues -F sub_issue_id=$(gh api repos/jhoffman-dev/sanctuary-farm/issues/<new> --jq .id)` — the API wants the issue's numeric **id**, not its number.
4. Add to the project: `gh project item-add <N> --owner jhoffman-dev --url <issue url>`, then set Status (below) to `Backlog` or `Ready`.

**Move status** — `gh project item-edit --project-id <project id> --id <item id> --field-id <Status field id> --single-select-option-id <option id>`.
Ids: project `gh project view <N> --owner jhoffman-dev --format json --jq .id`;
field + options from `gh project field-list <N> --owner jhoffman-dev --format json`;
item from `gh project item-list … --jq '.items[] | select(.content.number==<n>) | .id'`.

**Done** — don't close by hand: the PR body says `Closes #<n>` and the merge
closes it.

**Blocked** — `gh issue edit <n> -R jhoffman-dev/sanctuary-farm --add-label blocked`
plus `gh issue comment <n> … --body "Blocked: <why>"`; if it needs James,
`--add-assignee jhoffman-dev`. Remove the label when it clears.

**Note** — `gh issue comment <n> -R jhoffman-dev/sanctuary-farm --body "…"`.
