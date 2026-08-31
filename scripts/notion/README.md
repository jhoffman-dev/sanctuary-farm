# scripts/notion

Tooling for the Notion board ("Sanctuary Farm DB").

- **`gen-backlog.mjs`** — the starter backlog lives here as data. Edit the `rows`
  array, run `node scripts/notion/gen-backlog.mjs`, and it regenerates
  `docs/backlog.md` (readable) and `docs/backlog.csv` (importable). Do not
  hand-edit those two files.
- Import into Notion with the `notion-board` skill once credentials are set:
  `node .claude/skills/notion-board/notion.mjs import docs/backlog.csv`
  (Epics are created first so the `Epic` relation resolves).

Setup and schema: `docs/board.md`. After the first import, new tickets are
created directly with `notion.mjs create …` — the CSV is just the seed.
