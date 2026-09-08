# Environment quirks

- **Node** is Homebrew-installed (v26.x). In `Bash` tool calls, prefix with
  `export PATH="/opt/homebrew/bin:$PATH"` or `node`/`pnpm`/`gh` won't resolve.
- Package manager is **pnpm** (workspace). `pnpm gate` runs the whole gate;
  `pnpm e2e` runs Playwright (`pnpm --filter @sf/web exec playwright install
  chromium` once per machine).
- Installed CLIs: `gh` (authenticated as `jhoffman-dev`), `firebase-tools`
  (**not** logged in — `firebase login` is James' task, SF-29), `pnpm`.
- GitHub: <https://github.com/jhoffman-dev/sanctuary-farm> (private until SF-24
  decides otherwise). Branch protection on `main` is still open (SF-40).
- Worktree sessions: the Bash guard rejects compound shell scripts (multi-heredoc,
  `for` loops, long `&&` chains). Run one simple command at a time; write files
  with the Write/Edit tools.
- Notion board + docs are reached through the **Notion MCP connector** (skills:
  `notion-board`, `notion-docs`). No local token or CLI. If the connector isn't
  in the session, say so and proceed with code work. URLs + schema: `docs/board.md`.
