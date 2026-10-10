---
name: feature-workflow
description: The branch → tests → PR → review → merge loop for a Sanctuary Farm ticket, including gh CLI usage and moving the ticket (a GitHub issue) across the GitHub Project board. Use whenever you pick up a ticket to implement.
---

# Feature workflow

One ticket → one branch → one PR. Never work on `main`.

## 1. Claim

- `github-board` skill: set the issue's project Status → `In progress`.
- Branch from up-to-date `main`:
  `git switch main && git pull && git switch -c feat/SF-123-short-slug`
  (`feat/` · `fix/` · `chore/` · `spike/`).

## 2. Build

- Stay inside the layer the ticket names (see `docs/architecture.md`).
- Test-first where it's behaviour. Meet the coverage bar for the layer.
- Keep the diff to what the ticket implies — no drive-by refactors. If you find
  something else broken, file a Bug ticket, don't fix it here.

## 3. Gate (must be green before PR)

```
pnpm gate     # typecheck · lint · boundaries · tests + coverage · build
pnpm e2e      # Playwright smoke — required for anything player-facing
```

## 4. PR

```
git push -u origin feat/SF-123-short-slug
gh pr create --fill --base main
```
PR body: `Closes #<issue>` for the ticket (that links it and closes it on
merge), then **what changed** and **how it was verified** (gate output,
screenshots, e2e). One ticket per PR.

Then, via `github-board`: set the issue's project Status → `In review`.

## 5. Review

Hand to `qa` (verifies against AC) then `reviewer` (checks against `CLAUDE.md`).
Address `REQUEST CHANGES` on the same branch; push; re-request.

## 6. Merge

**A human (James) merges.** The merge closes the issue through `Closes #n`
(check it did; if not, close it as completed). Delete the branch.

## Blocked?

Add the `blocked` label, comment the reason, and if it needs James, assign
`jhoffman-dev` (`github-board`). Pick up the next `Ready` ticket.
