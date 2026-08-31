# Environment quirks

- **Node** is Homebrew-installed (v26.x). In `Bash` tool calls, prefix with
  `export PATH="/opt/homebrew/bin:$PATH"` or `node`/`npm`/`pnpm` won't resolve.
- Installed CLIs: `gh` (2.98), `firebase-tools` (15.28), `pnpm` (11.24).
- **Not authenticated** (interactive — Jonathan's tasks): `gh auth login`,
  `firebase login`. Until then no repo/CI/deploy work can finish.
- Playwright chromium lives at `~/Library/Caches/ms-playwright`. `playwright-core`
  is a devDependency; `npx playwright install chromium` if missing.
- No remote on the git repo yet. `main` is the working branch until CI + branch
  protection exist.
- Notion board access needs `.claude/notion.local.json` (gitignored) or
  `NOTION_TOKEN` / `SANCTUARY_FARM_DB_ID` env vars — not yet provided.
