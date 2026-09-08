---
name: feature-workflow
description: The branch → tests → PR → review → merge loop for a Sanctuary Farm ticket, including gh CLI usage and moving the Notion ticket across the board. Use whenever you pick up a ticket to implement.
---

# Feature workflow

One ticket → one branch → one PR. Never work on `main`.

## 1. Claim

- `notion-board` skill: set the ticket's Status → `In progress`.
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
PR body: link the ticket, say **what changed** and **how it was verified**
(gate output, screenshots, e2e). One ticket per PR.

Then, via `notion-board`: set the ticket's `PR` to the URL and Status → `In review`.

## 5. Review

Hand to `qa` (verifies against AC) then `reviewer` (checks against `CLAUDE.md`).
Address `REQUEST CHANGES` on the same branch; push; re-request.

## 6. Merge

**A human (James) merges.** After merge, via `notion-board`: set Status →
`Done`. Delete the branch.

## Blocked?

Set Status → `Blocked`, add a comment with the reason, and if it needs James,
set Assignee → `James`. Pick up the next `Ready` ticket.
