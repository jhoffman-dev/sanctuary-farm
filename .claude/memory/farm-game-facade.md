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
- `FarmGameDeps.ids` is accepted but unused until Phase 4 save codes.
- Fakes for application tests live in `packages/application/src/test-fakes.ts`
  (`harness()` wires seeded RNG + settable clock + in-memory store + recording
  audio). Do not import `@sf/persistence` from application tests.
