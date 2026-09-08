# FarmGame facade (`packages/application`) — contract gotchas

The UI talks to one stateful object, `createFarmGame(deps)`. Things that are
easy to get wrong when wiring it:

- **A finished round is still active.** After the last `answer()` returns
  `next: null`, `startRound` keeps throwing until `endRound()` has appended the
  `SessionLog`. Always `endRound()` before starting the next round, including
  when the player walks away mid-round (early `endRound` is fine — the
  unanswered question is dropped, not graded).
- **Latency is the application's.** `answer(given)` reads `clock.now()` itself;
  the UI never passes a duration. In tests drive `FakeClock.advance()`.
- **`roundProgress().asked` counts served questions (in-flight included);**
  `complete` means all answered. Question numbering for "3 of 10" comes from
  `Question.index` (0-based).
- `roundProgress()` with no round returns the idle value `{0, 0, false}`;
  `currentQuestion()` returns `null`. Only `startRound`/`answer`/`endRound`/
  `summary` throw when called out of order.
- `load()` applies the saved mute setting to the `AudioBus`; it does not write
  a fresh farm to the store — the first write happens on the first answer,
  `endRound`, `buyFeed` or `setMuted`.
- **Persisting calls commit after the save, not before.** `answer` / `endRound`
  / `buyFeed` / `setMuted` compute the next farm + round, `await
  saveStore.save()`, and only then swap the in-memory state. A rejected save
  leaves the game exactly where the caller saw it (same in-flight question,
  same coins, round still open — `endRound` can be retried) and the error
  propagates. These calls are serialised. Because `startRound` is
  synchronous and unsaved, it throws `a save is still in progress` if called
  while one of those promises is pending — always `await` them first.
- **A backwards clock grades as SLOW, not FLUENT.** `now < servedAt` means the
  real latency is unknown; the facade substitutes `FLUENT_MAX_MS` (game rule:
  latency drives mastery, so no free fluency / 2 coins). A stalled clock (0 ms)
  is still FLUENT. The domain throws `RangeError` on a negative latency.
- `startRound` throws `RangeError` when `plan.family` is not an integer in
  `[1, scheduler.maxTable]` — it never falls back to mixed practice.
- `PADDOCK_ROUND` (5 questions) is exported from `@sf/application`; the shell
  must not choose its own round length.
- `IdProvider` is gone from `@sf/application` (SF-36 review): a port with no
  implementation and no consumer is not a port yet. Reintroduce it in Phase 4,
  with save codes, alongside the adapter that implements it.
- Fakes for application tests live in `packages/application/src/test-fakes.ts`
  (`harness()` wires seeded RNG + settable clock + in-memory store + recording
  audio). Do not import `@sf/persistence` from application tests.
- **`answer()` grades the question that was on screen when it was called.** The
  in-flight question is captured synchronously at call time and re-checked by
  identity when the serialised turn comes; if it has since been graded and
  replaced, the call rejects with `that question is no longer in flight`. A
  double-tap therefore grades once and rejects once — it must never grade the
  replacement, which arrives at ~0 ms latency and would mint FLUENT coins and a
  box promotion for a fact the player never saw. `PracticePanel` never provokes
  it — a synchronous `inFlight` ref blocks the second tap before it reaches the
  facade — so the rejection stays a loud programming-error signal.
