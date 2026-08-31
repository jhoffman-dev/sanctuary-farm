---
name: feature-workflow
description: The branch → tests → PR → review → merge loop for a Sanctuary Farm ticket, including gh CLI usage and moving the Notion ticket across the board. Use whenever you pick up a ticket to implement.
---

# Feature workflow

One ticket → one branch → one PR. Never work on `main`.

## 1. Claim

- `notion-board`: `move SF-123 "In progress"`.
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
pnpm -w typecheck && pnpm -w lint && pnpm -w test && pnpm -w build
```
(or the current `npm run` equivalents). For player-facing changes also run
`npm run smoke` and eyeball the screenshots.

## 4. PR

```
git push -u origin feat/SF-123-short-slug
gh pr create --fill --base main
```
PR body: link the ticket, say **what changed** and **how it was verified**
(gate output, screenshots, e2e). One ticket per PR.

Then: `notion-board`: `link SF-123 <pr-url>` and `move SF-123 "In review"`.

## 5. Review

Hand to `qa` (verifies against AC) then `reviewer` (checks against `CLAUDE.md`).
Address `REQUEST CHANGES` on the same branch; push; re-request.

## 6. Merge

**A human (Jonathan) merges.** After merge:
`notion-board`: `move SF-123 Done`. Delete the branch.

## Blocked?

`move SF-123 Blocked`, `note` the reason, and if it needs Jonathan,
`assign SF-123 Jonathan`. Pick up the next `Ready` ticket.
