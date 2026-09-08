# Prototype gotchas (the old `src/`, removed 2026-09-07)

Found the hard way while building the alpha. The prototype is gone from the
working tree (git history before the `chore(SF-36)` rebuild commit still has
it: `git show main~1:src/...` until that merges, then `git log -- src`). Carry
the *lessons* into the rebuild; the file references are prototype-only.

- **Scheduler is re-entrant under React StrictMode.** `scheduler.next()` mutates
  state (recent-families ring), so StrictMode's double-invoke corrupted it. Fix
  was `idempotentScheduler` — caches the served fact until `grade()`. In the
  rebuild the scheduler is pure and lives in `packages/domain`; the *application*
  layer owns "one fact in flight at a time".
- **Egg practice must rotate a whole family.** `nextInFamily` originally
  introduced one fact and drilled it to mastery before the next → "same 4
  problems forever". `EGG_ROTATION = 4`: keep ~4 family facts in rotation, no
  back-to-back repeats.
- **Hotspots fired while walking through them.** Only trigger a hotspot when the
  keeper has *arrived* (`pathRef.current.length === 0`), not in transit, and not
  on spawn (seed `occupiedRef` with the spawn tile's hotspot).
- **Camera must not scroll** — off-screen hotspots became unclickable. The
  farmyard scales the whole map to fit the viewport instead.
- **Framer Motion SVG:** `motion.rect` / `motion.circle` need static initial
  attrs (`initial={false}` + a real `y`/`height`), or you get "attribute
  undefined" errors. Animate a bouncing ball with `<motion.g animate={{x,y}}>`
  wrapping a plain `<circle>`, never by animating `cx`/`cy`.
- **Coins only from paddock + nest.** `onGraded(result, { earnsCoins: true })` —
  care tasks and training never mint coins. This is a design non-negotiable.
- Node v26 + Vite 8 + React 19 + Tailwind 4 (`@tailwindcss/vite`) all fine
  together. Path alias `@/*` → `src/*`.
