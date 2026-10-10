# Environment quirks

- **Node** is Homebrew-installed (v26.x). In `Bash` tool calls, prefix with
  `export PATH="/opt/homebrew/bin:$PATH"` or `node`/`pnpm`/`gh` won't resolve.
- Package manager is **pnpm** (workspace). `pnpm gate` runs the whole gate;
  `pnpm e2e` runs Playwright (`pnpm --filter @sf/web exec playwright install
  chromium` once per machine).
- Installed CLIs: `gh` (authenticated as `jhoffman-dev`), `firebase-tools`
  (credentials present but **stale** — `emulators:start` prints "Authentication
  Error: Your credentials are no longer valid" twice and then serves fine, since
  emulators run on `demo-sanctuary-farm`. `firebase login --reauth` is James'
  task; agents never deploy), `pnpm`.
- Firebase is the **shared** `student-games-be188` project (homepage +
  Math Invaders live there too, from `~/Projects/student-games` and
  `~/Projects/math-invaders` — read-only to us). Our resources are namespaced:
  Hosting sites `sanctuary-farm` / `sanctuary-farm-landing`, functions codebase
  `sanctuary-farm`, named Firestore database `sanctuary-farm`. Never a bare
  `firebase deploy`; emulators need `--project demo-sanctuary-farm` now that the
  default project is real. Rules: `docs/deploy.md`.
- The Firestore rules test runs on the emulator's *default* database:
  `@firebase/rules-unit-testing` 5.0.2 has no database-id option. Re-check when
  it is upgraded.
- GitHub: <https://github.com/jhoffman-dev/sanctuary-farm> (private until SF-24
  decides otherwise). Branch protection on `main` is still open (SF-40).
- Worktree sessions: the Bash guard rejects compound shell scripts (multi-heredoc,
  `for` loops, long `&&` chains). Run one simple command at a time; write files
  with the Write/Edit tools.
- The **board** is GitHub Issues + the "Sanctuary Farm Project" (skill:
  `github-board`, `gh` CLI; `gh project` needs the `project` scope — the token
  had only `repo` on 2026-10-04). The **docs** mirror is reached through the
  **Notion MCP connector** (skill: `notion-docs`); if the connector isn't in the
  session, say so and proceed. See `board-moved-to-github.md`.
