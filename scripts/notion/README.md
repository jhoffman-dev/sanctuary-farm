# scripts/notion

- **`gen-backlog.mjs`** — the starter backlog as data. It was imported into the
  Notion board once (2026-08-31) and is kept only as a record of the seed set /
  for regenerating `docs/backlog.md` + `docs/backlog.csv`. Edit the `rows` array
  and run `node scripts/notion/gen-backlog.mjs` to regenerate those two files.
  Do not hand-edit them.

New tickets are created directly in Notion with the `notion-board` skill (Notion
MCP connector) — not by re-importing the CSV. Board schema and setup:
`docs/board.md`.
