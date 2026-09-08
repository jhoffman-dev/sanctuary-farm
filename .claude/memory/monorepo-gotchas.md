# Monorepo gotchas (the rebuild, 2026-09-07 →)

- **`SchedulerState.lastServed` and `commuteCredit` are state, not closure.**
  The prototype kept both in the scheduler closure (and lost them on reload).
  The pure domain can only get them from state, so they are persisted fields.
  `nextFact` / `nextFactInFamily` return a *new* state that already records the
  serve — grade against that state, never call `next*` twice for one question.
- **Vitest coverage + `--project` reports `0/0`.** Root coverage config collects
  nothing when a single project is selected. Use `pnpm test:coverage` from the
  root (all projects, thresholds enforced) or run vitest from inside the package
  with explicit `--coverage.include='src/**/*.ts'`.
- **oxlint + React 19:** `react/react-in-jsx-scope` is off in `.oxlintrc.json`
  (automatic JSX runtime). Don't re-enable it.
- **Worktree Bash guard** rejects compound scripts (multi-heredoc, `for`, long
  `&&` chains) — one simple command per call; write files with Write/Edit.
- **Prototype saves are not migrated.** `@sf/persistence` keeps the prototype's
  key (`sanctuary-farm/save`); a v2 blob there parses as "no save" and is
  overwritten on the first save. Deliberate.
