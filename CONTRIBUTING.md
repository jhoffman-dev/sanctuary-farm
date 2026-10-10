# Contributing

Sanctuary Farm is a math-fluency game for children. It is free, ad-free and
collects no personal information, and every contribution has to keep it that
way. Start with [`CLAUDE.md`](CLAUDE.md) — it is the handbook for how work is
done here; this file is the short path from a clean checkout to a merged PR.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

```bash
export PATH="/opt/homebrew/bin:$PATH"   # Homebrew Node on the maintainer's Mac
node --version                          # match .nvmrc (Node 26; >= 22 works) — `nvm use`
corepack enable                         # pnpm 11 (version pinned by packageManager)
pnpm install
pnpm dev                                # game at http://localhost:5173
pnpm --filter @sf/web exec playwright install chromium   # once, before pnpm e2e
```

`pnpm test:rules` runs `firestore.rules` against the Firebase emulator and needs
a JDK on the path — see [`firestore/README.md`](firestore/README.md). It is not
part of `pnpm gate`; run it when you touch the rules.

## The gate

```bash
pnpm gate    # typecheck · lint · boundaries · tests + coverage · build
pnpm e2e     # Playwright smoke — required for anything player-facing
```

The gate must be green before you ask for a merge, and the PR must say **what
was run and what it said**. Never "should work": if something fails, the output
goes in the PR and the ticket is not done. Full checklist:
[`docs/definition-of-done.md`](docs/definition-of-done.md).

## Architecture — the rule that matters

**Dependencies point inward.** `domain` → nothing; `application` → `domain`;
adapters (`persistence`, `audio`, `functions`) → `application` + `domain`;
`apps/web` → `application` and `domain` *types* only. `apps/web` holds zero game
rules — if a component decides what happens next rather than how it looks, it is
in the wrong layer. No `Date.now()` or `Math.random()` outside the composition
root; inject `Clock` and `Rng`. Cross-package imports go through a package's
public entry point. `pnpm boundaries` enforces the graph; the details are in
[`docs/architecture.md`](docs/architecture.md).

## Testing bar

70% lines repo-wide, and **90%+ with every rule tested** on the high-impact
slice — `packages/domain`, the application use-cases, and anything touching
saves, auth or a child's data (`pnpm test:coverage` enforces the domain
threshold). Domain tests are pure with a seeded RNG and a fixed clock; adapters
get round-trip *and* failure-mode integration tests; player-facing flows get a
component test and stay `pnpm e2e`-green. Test behaviour, not implementation —
no snapshot as a stand-in. A bug fix ships with the test that would have caught
it. See [`docs/definition-of-done.md`](docs/definition-of-done.md) §3.

## Branches, commits, PRs

Work is tracked on the Notion board ([`docs/board.md`](docs/board.md)), **not**
GitHub Issues. One ticket per PR.

- Branch: `feat/SF-123-short-slug`, also `fix/…`, `chore/…`, `docs/…`.
- Commit subject: `type: what changed` in the imperative, lower-case, no
  trailing period — e.g. `docs: threat model`, `chore: dependabot`. Reference
  the ticket in the body when it is not obvious from the branch.
- Open the PR **ready, not draft**, once the gate is green.
- Fill in [`.github/pull_request_template.md`](.github/pull_request_template.md):
  the ticket link, what changed, how it was verified (gate/e2e output,
  screenshots for visual changes), and the inward-dependencies + tests
  checklist. Move the Notion ticket to **In review** with the PR linked.
- A changed doc under `docs/` is pushed to its Notion page after merge; a new
  doc is added to `docs/README.md`.

## Secrets

Never commit a secret — not in code, config, a doc, a fixture, or a screenshot —
and never put one in client code, which ships to every browser. Secrets live in
the platform's store (GitHub Actions secrets, Firebase Secret Manager, your own
CLI login). If a task needs a credential, write the exact command for the
maintainer and stop. The inventory and the rules are in
[`docs/secrets.md`](docs/secrets.md).

## Kid safety and privacy

The audience is children, so the safety rules are product rules: no ads, no
purchases, no PII, no free text one child could show another, and nothing —
asset, copy or dependency — unsuitable for a 10-year-old. Adding tracking or
analytics is out of scope by default. Background:
[`docs/privacy.md`](docs/privacy.md) and
[`docs/threat-model.md`](docs/threat-model.md).

**Report a kid-safety or privacy concern privately to software@jhoffman.dev.**
Please do not open a public PR or post details anywhere public until it has been
looked at. The same address handles security reports and Code of Conduct
enforcement.

## AI agents

Most of the code here is written by AI coding agents working from board tickets
(`.claude/agents/`, `.claude/skills/`). They contribute under exactly these
rules — same architecture, same testing bar, same gate, same PR shape, same
secrets policy — and their PRs are reviewed and merged by a human like anyone
else's. Agent-to-agent notes belong in `.claude/memory/`, not in the docs.
