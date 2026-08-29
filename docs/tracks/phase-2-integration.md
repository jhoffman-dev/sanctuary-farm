# Phase 2 — integration

**Runs after Tracks A–E are merged into `main`.** Single agent.

## Owns
`src/App.tsx`, `src/main.tsx`, new `src/game/**` (screen graph, game state, hooks).
May read every track's modules; should not need to change them (if a track's public
surface is wrong, fix it minimally and note it).

## Steps

1. **Merge check.** All five track branches merged, `typecheck / lint / test / build` green
   on `main`.
2. **Game state.** A single store (plain React context + `useReducer`, or a small custom
   hook — no state library) holding: the `SaveStore`, a live `Scheduler`
   (`createScheduler(save.scheduler)`), the `AudioBus`, current `Screen`, current stall.
   On every graded answer: `save.scheduler = scheduler.snapshot()`, mirror
   `save.facts`, `store.save(save)`. Persist on every answer, not session end.
3. **Screen graph** (`Navigation`): `farmyard ⇄ barn ⇄ stall`, and
   `nest / paddock / feedshed / farmhouse → summary`. `Farmyard.onHotspot` maps
   barn→barn, nest→nest, paddock→paddock, feedshed→feedshed, farmhouse→summary
   (dashboard behind a long-press on the farmhouse sign + gate: an unlearned 2-digit
   product, or a 4-digit PIN).
4. **Cold start** (D6): on a fresh save, families 1/2/10 introduced; add the family-10
   `HatchedCreature` at `stallIndex 0` (gift, no ceremony); eggs for families 1 & 2.
5. **Daily chores:** if `lastChoresDate !== today`, mark every occupied stall hungry
   (`badges`). Clearing all stalls (~20 questions) sets `lastChoresDate = today` and routes
   to the summary, which says goodnight — no "one more round" prompt. Free sessions always
   available, never prompted.
6. **Eggs / nest hollow:** an egg per introduced-but-unhatched family; visual state from
   `scheduler.familyProgress(family)` vs `EGG_GLOW_AT / EGG_CRACK_AT / EGG_HATCH_AT`. When
   `familyJustMastered` comes back from a `grade()`, flag that family; on the next nest
   visit play the full-screen hatch sequence (`audioBus.play('hatch')`), unskippable the
   first time only, then add the `HatchedCreature` (next free `stallIndex`, params from
   `defaultCreatureParams` or Track D's definitions) and let her name it.
7. **Paddock:** `QuizPanel` with `mode={{ kind:'timed', durationMs: PADDOCK_DURATION_MS }}`,
   `context="paddock"`. Track a personal best in `save` (add a field via a v1→v2 migration
   in `store.migrate`, or reuse `currency`/`sessions`). Never compare to anyone else.
8. **Feed shed:** display-only pellet/coin totals. Earns nothing.
9. **Currency:** pellets/coins accrue ONLY from graded answers (e.g. +1 pellet per correct,
   +1 coin per FLUENT). Wire in the game state's on-graded handler. Nowhere else.
10. **Flip to the game:** `src/main.tsx` renders `<App/>` unconditionally (drop the
    `?app=1` guard; keep the dev routes reachable at `#/dev` if cheap, or move them behind
    `import.meta.env.DEV`).
11. **Settings:** mute toggle (persisted, `audioBus.setMuted`), respected everywhere.

## DoD
`typecheck / lint / test / build` green; a full day-one flow works in the browser: land at
the farmhouse door → walk to barn → feed the anchor creature through ~20 questions →
goodnight; walking to the nest shows eggs tracking progress; parent dashboard reachable and
correct.
