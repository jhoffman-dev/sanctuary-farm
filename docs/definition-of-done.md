# Definition of Done

A ticket is **Done** when a human has merged its PR and the board says so. A PR
is **ready for that merge** when every line below that applies is true. `qa`
checks the *behaviour* items; `reviewer` checks the *code* items; the human
merges only green PRs. If an item doesn't apply, the PR says why.

## 1. The ticket

- [ ] Every acceptance criterion on the ticket is met by the diff, not just
      described in the PR.
- [ ] Only the scope the ticket implies. Anything else found broken became its
      own ticket (skill: `write-ticket`).
- [ ] Nothing violates a game non-negotiable (`CLAUDE.md` §Game design) or an
      accepted ADR. A new expensive-to-reverse decision has an ADR (skill: `adr`).

## 2. The code

- [ ] Dependencies point inward and `pnpm boundaries` is clean. No rules in
      `apps/web`; no adapter imported outside `apps/web/src/composition/`.
- [ ] Clean Code per `CLAUDE.md`: names say *what*, functions do one thing and
      stay under ~30 lines, > 3 params become an object, comments explain *why*,
      no dead or commented-out code, no `any` without a one-line reason, no
      swallowed error without a comment saying why it is safe.
- [ ] No `Date.now()` / `Math.random()` outside the composition root — `Clock`
      and `Rng` are injected.
- [ ] Matches the surrounding code's idiom and comment density.

## 3. The tests

| Layer touched | Required |
| --- | --- |
| `packages/domain` | Unit tests, seeded RNG, every rule changed has a test; coverage stays ≥ 90% lines (`pnpm test:coverage` enforces it) |
| `packages/application` | A use-case test per behaviour, happy path + key edges, fake adapters |
| `packages/persistence` / `packages/audio` | Round-trip **and** failure-mode tests |
| `apps/web` | Component tests for the behaviour; `pnpm e2e` green; a new player-facing flow adds or extends an e2e |

- [ ] Tests assert behaviour, not implementation. No snapshot as a stand-in.
- [ ] A bug fix ships with the test that would have caught it.
- [ ] Deterministic: no real time, no unseeded randomness, no sleeps.

## 4. The gate (run, not assumed)

- [ ] `pnpm gate` green — typecheck · lint · boundaries · tests + coverage · build.
- [ ] `pnpm e2e` green for anything player-facing.
- [ ] CI green on the PR — the `gate`, `e2e` and `rules` jobs in
      `.github/workflows/ci.yml`.
- [ ] The PR says **what was run and what it said**. Never "should work" — if a
      test fails, the output is in the PR and the ticket is not done.

## 5. Player-facing changes

- [ ] Walked in a real browser; screenshots or a short clip in the PR.
- [ ] The accessibility checklist in `docs/accessibility.md` for the surfaces
      touched: keyboard-playable, text/icon feedback (never colour alone),
      reduced motion honoured, sizes within bounds.
- [ ] Within `docs/performance-budget.md` (bundle size check in the build output).
- [ ] No free text a child could see from another child; no PII collected
      (`docs/threat-model.md`).

## 6. The paperwork

- [ ] PR body links the ticket and follows `.github/pull_request_template.md`.
- [ ] Notion ticket is **In review** with the PR linked; **Done** after merge
      (skill: `notion-board`).
- [ ] A changed doc under `docs/` is pushed to its Notion page after merge
      (skill: `notion-docs`); a new doc is added to `docs/README.md`.
- [ ] A new env var, secret, or setup step is in `docs/secrets.md` / `README.md`.
- [ ] Anything the next agent needs to know is in `.claude/memory/`.

## What "done" is not

- Compiles. Typechecks. "Tests pass locally" without the output.
- Merged with a failing or skipped check.
- Working on the author's machine but not from a clean `pnpm install`.
