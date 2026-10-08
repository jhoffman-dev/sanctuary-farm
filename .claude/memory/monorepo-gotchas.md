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
- **The domain throws on caller bugs; adapters validate first.** `gradeAnswer`
  throws `RangeError` for a latency that is not a finite number ≥ 0 (the
  application grades a backwards clock as SLOW) and `Error(/never introduced/)` for a
  fact at box 0 — only grade the fact `next*` just served. Every table-size entry
  point (`buildFacts`, `initialSchedulerState`, `emptyFarmSave`, `factsInFamily`,
  `factsInTier`, and so `cardsInPlay` on a loaded state) throws `RangeError`
  unless `maxTable` is an integer in `MIN_TABLE..MAX_TABLE_DEFAULT`; persistence
  must reject a bad `maxTable` before handing a state to the scheduler
  (`assertTableSize` is exported for that).
- **Prototype saves are not migrated.** `@sf/persistence` keeps the prototype's
  key (`sanctuary-farm/save`); a v2 blob there parses as "no save" and is
  overwritten on the first save. Deliberate.
- **An empty tier is *cleared*, not unmet.** `tierOf` is written for the 12×12
  table, so a smaller `maxTable` leaves whole tiers with no facts (an 8×8 table
  has no "has a 9" tier-4 fact). `withUnlockedTiers` treats a tier with no cards
  in play as satisfied — anything else walls off every tier above it for good,
  and 6×7 / 7×8 / 6×8 are never introduced. `tiers.test.ts` walks every table
  size 1..12 to full introduction and would catch a regression.
- **A structurally valid save can still be unplayable.** Persistence calls
  domain `hasPlayableFact()`: unless a fact is introduced, or one can be
  introduced *within the tiers the blob itself unlocked and outside the blocked
  family*, the save is rejected and the game starts fresh — otherwise the first
  `nextFact` throws `scheduler: no candidate facts` out of `startRound`.
- **The r3f frameloop is readable from the DOM.** `<Canvas>` spreads unknown
  props onto its container div, so `data-frameloop` / `data-testid="scene"` on
  it survive to the page and Playwright's `reducedMotion: 'reduce'` can assert
  the rule without touching WebGL. Component tests mock the scene; don't try to
  fake a WebGL context in jsdom.
- **The world is a lazy chunk; keep three out of the shell.** `App` renders
  `scene/LazyFarmScene` with the composition root's `loadFarmWorld`; it is
  the only module allowed to reach `./FarmScene`, and it suspends with
  React 19 `use()` on one cached promise per loader (no `React.lazy` — oxlint's
  `static-components` rejects creating one per loader). Any import of `three` / `@react-three/fiber` from outside
  `scene/` pulls ~230 kB gz back into the initial chunk and `pnpm size` fails
  (limits in `apps/web/package.json`, budget in `docs/performance-budget.md`).
  Vite names the chunk after the imported file, so the size-limit path
  `dist/assets/FarmScene-*.js` breaks if `FarmScene.tsx` is renamed.
  `@sf/world` is pinned to `tile-world-*.js` by `manualChunks` in
  `vite.config.ts`. A component test that renders `LazyFarmScene` must
  `await act(async () => render(…))`, or `use()` never retries.
- **Dev-only routes.** `?assets=1` (catalogue) and `?view=` (scene cameras)
  exist only under `import.meta.env.DEV`; their e2e specs are `*.dev.spec.ts`
  and run in the `chromium-dev` Playwright project against `vite` on :5174.
- **`App.test.tsx` mocks `./scene/LazyFarmScene`, not `./scene/FarmScene`.**
  Mocking the inner module leaves the Suspense fallback on screen, and its
  `role="status"` collides with the app's own "Waking up the farm…" status —
  `getByRole('status')` then finds two.
- **A `React.lazy` promise is cached per module instance**, so only the first
  render in a test file ever sees the fallback. Test the fallback
  (`SceneLoading`) directly rather than trying to catch it twice.
- **Quality tiers decide the frameloop (SF-80).** Headless Chromium renders
  in software (SwiftShader), so the tier probe puts every e2e run on the
  **low** tier unless the URL says `?quality=high`: no shadows, idle clips
  held, and `data-frameloop="demand"` once the farm is still. A spec that
  needs the full look (screenshots, the high tier's draw calls) pins
  `?quality=high`; Playwright contexts start with empty localStorage, so the
  remembered tier never leaks between tests. On demand, `?perf=1` ticks a
  frame every 0.5 s — wait on `data-publishes`, not on `data-fps` changing.
- **Parallel worktrees share the e2e ports.** Playwright's web servers use
  fixed ports (4173 preview, 5174 dev) with `reuseExistingServer` outside CI,
  so a run in one worktree silently tests another worktree's server if that
  one is up — failures that look like your change (missing attributes, empty
  probes). Check `lsof -iTCP:4173 -sTCP:LISTEN` first, or run `CI=1 pnpm e2e`,
  which starts its own servers and fails loudly on a busy port.
