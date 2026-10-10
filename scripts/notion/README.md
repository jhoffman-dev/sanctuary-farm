# scripts/notion

- **`gen-backlog.mjs`** — the starter backlog as data. It was imported into the
  Notion board once (2026-08-31) and is kept only as a record of the seed set /
  for regenerating `docs/backlog.md` + `docs/backlog.csv`. Edit the `rows` array
  and run `node scripts/notion/gen-backlog.mjs` to regenerate those two files.
  Do not hand-edit them.

The board moved to GitHub Issues on 2026-10-04: new tickets are GitHub issues
created with the `github-board` skill — never by re-importing the CSV. See
`docs/board.md`.
