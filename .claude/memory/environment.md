# Environment quirks

- **Node** is Homebrew-installed (v26.x). In `Bash` tool calls, prefix with
  `export PATH="/opt/homebrew/bin:$PATH"` or `node`/`npm`/`pnpm` won't resolve.
- Installed CLIs: `gh` (2.98), `firebase-tools` (15.28), `pnpm` (11.24).
- **Not authenticated** (interactive — James' tasks): `gh auth login`,
  `firebase login`. Until then no repo/CI/deploy work can finish.
- Playwright chromium lives at `~/Library/Caches/ms-playwright`. `playwright-core`
  is a devDependency; `npx playwright install chromium` if missing.
- No remote on the git repo yet. `main` is the working branch until CI + branch
  protection exist.
- Notion board + docs are reached through the **Notion MCP connector** (skills:
  `notion-board`, `notion-docs`). No local token or CLI. If the connector isn't
  in the session, say so and proceed with code work. URLs + schema: `docs/board.md`.
