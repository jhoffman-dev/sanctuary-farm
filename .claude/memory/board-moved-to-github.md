# The board moved from Notion to GitHub (2026-10-04)

- Tickets are **GitHub issues** on `jhoffman-dev/sanctuary-farm`, tracked on the
  GitHub Project **"Sanctuary Farm Project"**. Skill: `github-board`; mapping +
  commands: `docs/board.md`.
- **Offset:** Notion `SF-n` (1–80) = issue **#(n + 29)** (SF-1 = #30, SF-80 =
  #109). Full table: `docs/notion-migration.md`. Commits, branches and PRs from
  before the move cite `SF-n`; translate with the offset.
- New tickets keep the key in the title — `[SF-81] …` onward — and in branch
  names (`feat/SF-81-slug`). PRs link with `Closes #<issue>`.
- Phase = milestone; type/priority/size = labels; parent = sub-issue (phase epics
  #30–#36); `blocked` / `later` = labels; Done = closed; other statuses = the
  project's Status field (read its options with `gh project field-list`).
- `gh project …` needs the `project` token scope (`gh auth refresh -s project`);
  on 2026-10-04 the token had `repo` but not `project`.
- The old Notion board is read-only history. The **prose docs are still mirrored
  to Notion** (skill: `notion-docs`) — only the board moved.
